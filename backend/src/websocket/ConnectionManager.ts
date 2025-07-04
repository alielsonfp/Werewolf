// 🐺 LOBISOMEM ONLINE - Connection Manager (CORRIGIDO)
import { randomUUID } from 'crypto';
import { wsLogger } from '@/utils/logger';
import type WebSocket from 'ws';
import type { ConnectionContext, ConnectionMetadata, WebSocketConnection } from '@/types';

// CORREÇÃO: Tipo mapeado para permitir `undefined` nas atualizações, possibilitando a remoção de propriedades.
type ConnectionContextUpdates = {
    [K in keyof ConnectionContext]?: ConnectionContext[K] | undefined;
};

export class ConnectionManager {
    private connections = new Map<string, WebSocketConnection>();
    private userConnections = new Map<string, string>();

    addConnection(ws: WebSocket, context: ConnectionContext, metadata: ConnectionMetadata): string {
        const connectionId = randomUUID();
        const existingConnectionId = this.userConnections.get(context.userId);
        if (existingConnectionId) {
            this.removeConnection(existingConnectionId);
        }

        const connection: WebSocketConnection = {
            id: connectionId, ws, context, metadata,
            isAlive: true, lastPing: Date.now(), reconnectAttempts: 0,
        };

        this.connections.set(connectionId, connection);
        this.userConnections.set(context.userId, connectionId);
        return connectionId;
    }

    removeConnection(connectionId: string): boolean {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        this.userConnections.delete(connection.context.userId);
        if (connection.ws.readyState === connection.ws.OPEN) connection.ws.close();
        this.connections.delete(connectionId);
        return true;
    }

    getConnection(connectionId: string): WebSocketConnection | undefined {
        return this.connections.get(connectionId);
    }

    getUserConnection(userId: string): string | undefined {
        return this.userConnections.get(userId);
    }

    getAllConnections(): WebSocketConnection[] {
        return Array.from(this.connections.values());
    }

    getConnectionCount(): number {
        return this.connections.size;
    }

    // CORREÇÃO: Assinatura e implementação robustas para atualizações de contexto.
    updateConnectionContext(connectionId: string, updates: ConnectionContextUpdates): boolean {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        for (const key in updates) {
            const k = key as keyof ConnectionContext;
            const value = updates[k];
            if (value === undefined) {
                delete connection.context[k];
            } else {
                // @ts-ignore - Sabemos que o tipo está correto aqui.
                connection.context[k] = value;
            }
        }
        return true;
    }

    markAlive(connectionId: string): boolean {
        const conn = this.getConnection(connectionId);
        if (conn) {
            conn.isAlive = true;
            conn.lastPing = Date.now();
            return true;
        }
        return false;
    }

    markDead(connectionId: string): boolean {
        const conn = this.getConnection(connectionId);
        if (conn) {
            conn.isAlive = false;
            return true;
        }
        return false;
    }

    getDeadConnections(): string[] {
        return Array.from(this.connections.values())
            .filter(c => !c.isAlive)
            .map(c => c.id);
    }

    clear(): void {
        this.connections.forEach(conn => conn.ws.close());
        this.connections.clear();
        this.userConnections.clear();
    }
}