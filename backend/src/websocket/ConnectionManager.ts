// 🔄 LOBISOMEM ONLINE - Connection Manager (MODIFICAÇÕES A10)
// Localização: backend/src/websocket/ConnectionManager.ts

import WebSocket from 'ws';
import { wsLogger } from '@/utils/logger';
import { ReconnectionManager } from './ReconnectionManager';
import { InactivityManager } from './InactivityManager';
import type { ConnectionContext, ConnectionMetadata, WebSocketConnection } from '@/types';

// Interface atualizada para A10
interface EnhancedWebSocketConnection extends WebSocketConnection {
    lastActivity: Date;
    reconnectTimeout?: NodeJS.Timeout;
    maxInactivityTime: number; // A10.6 - timeout inatividade
    isSpectator: boolean; // A10.1 - espectadores
    previousGameState?: any; // A10.3 - estado para recuperação
}

export class ConnectionManager {
    private connections = new Map<string, EnhancedWebSocketConnection>();
    private userConnections = new Map<string, string>();

    // Novos managers para A10
    private reconnectionManager = new ReconnectionManager();
    private inactivityManager = new InactivityManager((connectionId, reason) => {
        this.handleInactivityEvent(connectionId, reason);
    });

    public getAllConnections(): EnhancedWebSocketConnection[] {
        return Array.from(this.connections.values());
    }

    public getDeadConnections(): EnhancedWebSocketConnection[] {
        return Array.from(this.connections.values()).filter(conn => !conn.isAlive);
    }

    public markDead(connectionId: string): boolean {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.isAlive = false;
            return true;
        }
        return false;
    }

    public markAlive(connectionId: string): boolean {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.isAlive = true;
            connection.lastPing = Date.now(); // Atualiza também o timestamp do último ping
            return true;
        }
        return false;
    }

    /**
     * Adiciona nova conexão com suporte a reconexão e espectadores
     */
    addConnection(connection: WebSocketConnection): void {
        const enhancedConnection: EnhancedWebSocketConnection = {
            ...connection,
            lastActivity: new Date(),
            maxInactivityTime: 300000, // 5 minutos padrão
            isSpectator: connection.context.isSpectator || false,
            previousGameState: undefined
        };

        this.connections.set(connection.id, enhancedConnection);
        this.userConnections.set(connection.context.userId, connection.id);

        // Adiciona ao rastreamento de inatividade
        this.inactivityManager.addConnection(connection.id, connection.context.userId);

        // Verifica se é uma reconexão
        if (this.reconnectionManager.isReconnectionAllowed(connection.context.userId)) {
            this.handleReconnection(connection.id);
        }

        wsLogger.info('Enhanced connection added', {
            connectionId: connection.id,
            userId: connection.context.userId,
            isSpectator: enhancedConnection.isSpectator,
            serverId: connection.context.serverId
        });
    }

    /**
     * Remove conexão com lógica de reconexão
     */
    removeConnection(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Remove do rastreamento de inatividade
        this.inactivityManager.removeConnection(connectionId);

        // Armazena estado para reconexão se estiver em jogo
        if (connection.context.roomId) {
            this.storeConnectionState(connectionId, {
                roomId: connection.context.roomId,
                gameState: connection.previousGameState,
                isSpectator: connection.isSpectator
            });
        }

        // Remove da lista de conexões
        this.connections.delete(connectionId);
        this.userConnections.delete(connection.context.userId);

        wsLogger.info('Connection removed, state stored for reconnection', {
            connectionId,
            userId: connection.context.userId,
            roomId: connection.context.roomId,
            isSpectator: connection.isSpectator
        });
    }

    /**
     * Marca conexão como inativa (não remove imediatamente)
     */
    markInactive(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        connection.lastActivity = new Date();

        wsLogger.info('Connection marked as inactive', {
            connectionId,
            userId: connection.context.userId
        });
    }

    /**
     * Agenda limpeza de reconexão
     */
    scheduleReconnectCleanup(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        this.reconnectionManager.scheduleCleanup(connection.context.userId);
    }

    /**
     * Cancela limpeza de reconexão
     */
    cancelReconnectCleanup(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        this.reconnectionManager.cancelCleanup(connection.context.userId);
    }

    /**
     * Armazena estado da conexão para recuperação
     */
    storeConnectionState(connectionId: string, gameState: {
        roomId?: string;
        gameState?: any;
        isSpectator: boolean;
    }): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Atualiza estado atual da conexão
        connection.previousGameState = gameState.gameState;

        // Armazena no manager de reconexão
        this.reconnectionManager.storeState(connection.context.userId, gameState);

        wsLogger.info('Connection state stored', {
            connectionId,
            userId: connection.context.userId,
            roomId: gameState.roomId,
            isSpectator: gameState.isSpectator
        });
    }

    /**
     * Recupera estado armazenado de um usuário
     */
    getStoredState(userId: string): any {
        return this.reconnectionManager.retrieveState(userId);
    }

    /**
     * Manipula evento de reconexão
     */
    private handleReconnection(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        const storedState = this.reconnectionManager.retrieveState(connection.context.userId);
        if (!storedState) return;

        // Restaura estado da conexão
        connection.previousGameState = storedState.gameState;
        connection.isSpectator = storedState.isSpectator;

        // Atualiza contexto se necessário
        if (storedState.roomId) {
            connection.context.roomId = storedState.roomId;
        }

        wsLogger.info('Connection state restored from reconnection', {
            connectionId,
            userId: connection.context.userId,
            roomId: storedState.roomId,
            isSpectator: storedState.isSpectator
        });

        // Confirma reconexão
        this.reconnectionManager.confirmReconnection(connection.context.userId);
    }

    /**
     * Manipula eventos de inatividade
     */
    private handleInactivityEvent(connectionId: string, reason: 'warning' | 'kick'): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (reason === 'warning') {
            // Envia aviso ao cliente
            if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.send(JSON.stringify({
                    type: 'inactivity-warning',
                    data: {
                        message: 'Você será desconectado por inatividade em breve',
                        timeRemaining: 60000 // 1 minuto
                    }
                }));
            }
        } else if (reason === 'kick') {
            // Desconecta por inatividade
            connection.ws.close(1000, 'Desconectado por inatividade');
        }

        wsLogger.info('Inactivity event handled', {
            connectionId,
            userId: connection.context.userId,
            reason
        });
    }

    /**
     * Atualiza atividade de uma conexão
     */
    updateActivity(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        connection.lastActivity = new Date();
        this.inactivityManager.trackActivity(connectionId);
    }

    /**
     * Obtém conexões por sala (separando players e espectadores)
     */
    getRoomConnections(roomId: string): {
        players: EnhancedWebSocketConnection[];
        spectators: EnhancedWebSocketConnection[];
    } {
        const players: EnhancedWebSocketConnection[] = [];
        const spectators: EnhancedWebSocketConnection[] = [];

        for (const connection of this.connections.values()) {
            if (connection.context.roomId === roomId) {
                if (connection.isSpectator) {
                    spectators.push(connection);
                } else {
                    players.push(connection);
                }
            }
        }

        return { players, spectators };
    }

    /**
     * Obtém apenas conexões de espectadores de uma sala
     */
    getRoomSpectators(roomId: string): EnhancedWebSocketConnection[] {
        return Array.from(this.connections.values())
            .filter(conn => conn.context.roomId === roomId && conn.isSpectator);
    }

    /**
     * Obtém apenas conexões de jogadores de uma sala
     */
    getRoomPlayers(roomId: string): EnhancedWebSocketConnection[] {
        return Array.from(this.connections.values())
            .filter(conn => conn.context.roomId === roomId && !conn.isSpectator);
    }

    /**
     * Verifica se usuário pode reconectar
     */
    canUserReconnect(userId: string): boolean {
        return this.reconnectionManager.isReconnectionAllowed(userId);
    }

    /**
     * Força limpeza de estado de reconexão
     */
    forceCleanupReconnection(userId: string): void {
        this.reconnectionManager.forceCleanup(userId);
    }

    /**
     * Obtém estatísticas detalhadas
     */
    getDetailedStats(): {
        totalConnections: number;
        activeConnections: number;
        spectatorConnections: number;
        playerConnections: number;
        reconnectionStats: any;
        inactivityStats: any;
    } {
        let spectators = 0;
        let players = 0;
        let active = 0;

        for (const connection of this.connections.values()) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                active++;
            }

            if (connection.isSpectator) {
                spectators++;
            } else {
                players++;
            }
        }

        return {
            totalConnections: this.connections.size,
            activeConnections: active,
            spectatorConnections: spectators,
            playerConnections: players,
            reconnectionStats: this.reconnectionManager.getStats(),
            inactivityStats: this.inactivityManager.getStats()
        };
    }

    /**
     * Métodos existentes mantidos para compatibilidade
     */
    getConnection(connectionId: string): EnhancedWebSocketConnection | undefined {
        return this.connections.get(connectionId);
    }

    getUserConnection(userId: string): string | undefined {
        return this.userConnections.get(userId);
    }

    getConnectionsByUser(userId: string): EnhancedWebSocketConnection[] {
        const connectionId = this.userConnections.get(userId);
        if (!connectionId) return [];

        const connection = this.connections.get(connectionId);
        return connection ? [connection] : [];
    }

    getConnectionsByRoom(roomId: string): EnhancedWebSocketConnection[] {
        return Array.from(this.connections.values())
            .filter(conn => conn.context.roomId === roomId);
    }

    public getConnectionCount(): number {
        return this.connections.size;
    }

    /**
     * Cleanup para shutdown
     */
    cleanup(): void {
        this.reconnectionManager.cleanup();
        this.inactivityManager.cleanup();

        // Fecha todas as conexões
        for (const connection of this.connections.values()) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.close(1001, 'Server shutdown');
            }
        }

        this.connections.clear();
        this.userConnections.clear();

        wsLogger.info('ConnectionManager cleanup completed');
    }
}