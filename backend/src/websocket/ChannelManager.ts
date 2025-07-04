// 🐺 LOBISOMEM ONLINE - Channel Manager (Corrigido)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → game-service
import { wsLogger } from '@/utils/logger';
import type { ConnectionManager } from './ConnectionManager';

//====================================================================
// CHANNEL MANAGER CLASS (Simplified for Task 4)
//====================================================================
export class ChannelManager {
    private roomPlayers = new Map<string, Set<string>>(); // roomId -> Set<connectionId>
    private roomSpectators = new Map<string, Set<string>>(); // roomId -> Set<connectionId>
    private connectionRooms = new Map<string, string>(); // connectionId -> roomId

    constructor(private connectionManager: ConnectionManager) {
        wsLogger.debug('ChannelManager initialized');
    }

    //====================================================================
    // ROOM MANAGEMENT (Main Use Case for Task 4)
    //====================================================================
    joinRoom(roomId: string, connectionId: string, asSpectator: boolean = false): boolean {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection) {
            wsLogger.warn('Cannot join room - connection not found', { connectionId, roomId });
            return false;
        }

        // Remove from previous room if any
        const currentRoom = this.connectionRooms.get(connectionId);
        if (currentRoom) {
            this.leaveRoom(currentRoom, connectionId);
        }

        // Add to appropriate set
        if (asSpectator) {
            if (!this.roomSpectators.has(roomId)) {
                this.roomSpectators.set(roomId, new Set());
            }
            this.roomSpectators.get(roomId)!.add(connectionId);
        } else {
            if (!this.roomPlayers.has(roomId)) {
                this.roomPlayers.set(roomId, new Set());
            }
            this.roomPlayers.get(roomId)!.add(connectionId);
        }

        // Track connection's room
        this.connectionRooms.set(connectionId, roomId);

        wsLogger.debug('Connection joined room', {
            connectionId,
            userId: connection.context.userId,
            roomId,
            asSpectator,
            playersCount: this.roomPlayers.get(roomId)?.size || 0,
            spectatorsCount: this.roomSpectators.get(roomId)?.size || 0,
        });

        return true;
    }

    leaveRoom(roomId: string, connectionId: string): boolean {
        const connection = this.connectionManager.getConnection(connectionId);
        let wasInRoom = false;

        // Remove from players
        const players = this.roomPlayers.get(roomId);
        if (players && players.has(connectionId)) {
            players.delete(connectionId);
            wasInRoom = true;

            // Cleanup empty room
            if (players.size === 0) {
                this.roomPlayers.delete(roomId);
            }
        }

        // Remove from spectators
        const spectators = this.roomSpectators.get(roomId);
        if (spectators && spectators.has(connectionId)) {
            spectators.delete(connectionId);
            wasInRoom = true;

            // Cleanup empty room
            if (spectators.size === 0) {
                this.roomSpectators.delete(roomId);
            }
        }

        // Remove room tracking
        if (wasInRoom) {
            this.connectionRooms.delete(connectionId);
        }

        if (wasInRoom) {
            wsLogger.debug('Connection left room', {
                connectionId,
                userId: connection?.context.userId,
                roomId,
                playersCount: this.roomPlayers.get(roomId)?.size || 0,
                spectatorsCount: this.roomSpectators.get(roomId)?.size || 0,
            });
        }

        return wasInRoom;
    }

    //====================================================================
    // CONNECTION QUERIES
    //====================================================================
    getRoomConnections(roomId: string): Set<string> {
        const players = this.roomPlayers.get(roomId) || new Set();
        const spectators = this.roomSpectators.get(roomId) || new Set();

        const allConnections = new Set<string>();
        players.forEach(id => allConnections.add(id));
        spectators.forEach(id => allConnections.add(id));

        return allConnections;
    }

    getRoomPlayerConnections(roomId: string): Set<string> {
        return new Set(this.roomPlayers.get(roomId) || []);
    }

    getRoomSpectatorConnections(roomId: string): Set<string> {
        return new Set(this.roomSpectators.get(roomId) || []);
    }

    getConnectionRoom(connectionId: string): string | undefined {
        return this.connectionRooms.get(connectionId);
    }

    //====================================================================
    // BROADCASTING
    //====================================================================
    broadcastToRoom(
        roomId: string,
        type: string,
        data?: any,
        excludeConnectionId?: string
    ): number {
        const connections = this.getRoomConnections(roomId);
        let sentCount = 0;

        const message = {
            type,
            data,
            timestamp: new Date().toISOString(),
        };

        for (const connectionId of connections) {
            if (excludeConnectionId && connectionId === excludeConnectionId) {
                continue;
            }

            const connection = this.connectionManager.getConnection(connectionId);
            if (connection && connection.ws.readyState === connection.ws.OPEN) {
                try {
                    connection.ws.send(JSON.stringify(message));
                    sentCount++;
                } catch (error) {
                    wsLogger.error('Failed to send message to connection in room', error instanceof Error ? error : new Error('Unknown send error'), {
                        roomId,
                        connectionId,
                        type,
                    });
                }
            }
        }

        return sentCount;
    }

    broadcastToPlayers(roomId: string, type: string, data?: any, excludeConnectionId?: string): number {
        const players = this.roomPlayers.get(roomId);
        if (!players) return 0;

        let sentCount = 0;
        const message = {
            type,
            data,
            timestamp: new Date().toISOString(),
        };

        for (const connectionId of players) {
            if (excludeConnectionId && connectionId === excludeConnectionId) {
                continue;
            }

            const connection = this.connectionManager.getConnection(connectionId);
            if (connection && connection.ws.readyState === connection.ws.OPEN) {
                try {
                    connection.ws.send(JSON.stringify(message));
                    sentCount++;
                } catch (error) {
                    wsLogger.error('Failed to send message to player', error instanceof Error ? error : new Error('Unknown player send error'), {
                        roomId,
                        connectionId,
                        type,
                    });
                }
            }
        }

        return sentCount;
    }

    broadcastToSpectators(roomId: string, type: string, data?: any, excludeConnectionId?: string): number {
        const spectators = this.roomSpectators.get(roomId);
        if (!spectators) return 0;

        let sentCount = 0;
        const message = {
            type,
            data,
            timestamp: new Date().toISOString(),
        };

        for (const connectionId of spectators) {
            if (excludeConnectionId && connectionId === excludeConnectionId) {
                continue;
            }

            const connection = this.connectionManager.getConnection(connectionId);
            if (connection && connection.ws.readyState === connection.ws.OPEN) {
                try {
                    connection.ws.send(JSON.stringify(message));
                    sentCount++;
                } catch (error) {
                    wsLogger.error('Failed to send message to spectator', error instanceof Error ? error : new Error('Unknown spectator send error'), {
                        roomId,
                        connectionId,
                        type,
                    });
                }
            }
        }

        return sentCount;
    }

    //====================================================================
    // STATISTICS AND MONITORING
    //====================================================================
    getActiveRoomsCount(): number {
        const activeRooms = new Set<string>();

        for (const roomId of this.roomPlayers.keys()) {
            activeRooms.add(roomId);
        }

        for (const roomId of this.roomSpectators.keys()) {
            activeRooms.add(roomId);
        }

        return activeRooms.size;
    }

    getRoomStats(roomId: string) {
        const playersCount = this.roomPlayers.get(roomId)?.size || 0;
        const spectatorsCount = this.roomSpectators.get(roomId)?.size || 0;

        return {
            roomId,
            playersCount,
            spectatorsCount,
            totalConnections: playersCount + spectatorsCount,
        };
    }

    getAllStats() {
        const allRooms = new Set<string>();

        for (const roomId of this.roomPlayers.keys()) {
            allRooms.add(roomId);
        }

        for (const roomId of this.roomSpectators.keys()) {
            allRooms.add(roomId);
        }

        let totalConnections = 0;
        for (const roomId of allRooms) {
            const stats = this.getRoomStats(roomId);
            totalConnections += stats.totalConnections;
        }

        return {
            totalRooms: allRooms.size,
            totalConnections,
            averageRoomSize: allRooms.size > 0 ? totalConnections / allRooms.size : 0,
        };
    }

    //====================================================================
    // CLEANUP
    //====================================================================
    removeConnectionFromAllRooms(connectionId: string): void {
        const roomId = this.connectionRooms.get(connectionId);
        if (roomId) {
            this.leaveRoom(roomId, connectionId);
        }
    }

    clear(): void {
        this.roomPlayers.clear();
        this.roomSpectators.clear();
        this.connectionRooms.clear();

        wsLogger.info('ChannelManager cleared');
    }
}