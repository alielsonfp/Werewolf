// 🐺 LOBISOMEM ONLINE - Connection Manager (CORRIGIDO COMPLETO)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → game-service
import { wsLogger } from '@/utils/logger';
import type { WebSocketConnection, ConnectionContext, ConnectionMetadata } from '@/types';
import type WebSocket from 'ws';

//====================================================================
// CONNECTION MANAGER CLASS
//====================================================================
export class ConnectionManager {
  private connections = new Map<string, WebSocketConnection>();

  constructor() {
    wsLogger.debug('ConnectionManager initialized');
  }

  //====================================================================
  // CONNECTION MANAGEMENT
  //====================================================================
  addConnection(
    id: string,
    ws: WebSocket,
    context: ConnectionContext,
    metadata: ConnectionMetadata
  ): WebSocketConnection {
    const connection: WebSocketConnection = {
      id,
      ws,
      context,
      metadata,
      isAlive: true,
      lastPing: Date.now(),
      reconnectAttempts: 0,
    };

    this.connections.set(id, connection);

    wsLogger.info('Connection added', {
      connectionId: id,
      userId: context.userId,
      username: context.username,
      totalConnections: this.connections.size,
    });

    return connection;
  }

  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    this.connections.delete(connectionId);

    wsLogger.info('Connection removed', {
      connectionId,
      userId: connection.context.userId,
      username: connection.context.username,
      totalConnections: this.connections.size,
    });

    return true;
  }

  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  //====================================================================
  // ✅ NOVO: ENCONTRAR CONEXÃO POR USER ID
  //====================================================================
  findConnectionByUserId(userId: string): WebSocketConnection | null {
    // Iterar sobre todas as conexões para encontrar pelo userId
    for (const [connectionId, connection] of this.connections) {
      if (connection.context.userId === userId) {
        // Verificar se a conexão ainda está válida
        if (connection.ws.readyState === connection.ws.OPEN) {
          return connection;
        } else {
          // Limpar conexão inválida
          wsLogger.warn('Found dead connection for user, cleaning up', {
            userId,
            connectionId
          });
          this.removeConnection(connectionId);
        }
      }
    }

    wsLogger.debug('No active connection found for user', { userId });
    return null;
  }

  //====================================================================
  // ✅ NOVO: OBTER TODAS CONEXÕES DE UM USUÁRIO
  //====================================================================
  getAllConnectionsForUser(userId: string): WebSocketConnection[] {
    const userConnections: WebSocketConnection[] = [];

    for (const [connectionId, connection] of this.connections) {
      if (connection.context.userId === userId) {
        if (connection.ws.readyState === connection.ws.OPEN) {
          userConnections.push(connection);
        } else {
          // Limpar conexão inválida
          this.removeConnection(connectionId);
        }
      }
    }

    return userConnections;
  }

  //====================================================================
  // CONNECTION STATUS
  //====================================================================
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionsCount(): number {
    return this.connections.size;
  }

  //====================================================================
  // ✅ NOVO: CONTAR CONEXÕES ATIVAS POR USUÁRIO
  //====================================================================
  getActiveConnectionsCount(): number {
    let activeCount = 0;

    for (const [connectionId, connection] of this.connections) {
      if (connection.ws.readyState === connection.ws.OPEN) {
        activeCount++;
      } else {
        // Aproveitar para limpar conexões mortas
        this.removeConnection(connectionId);
      }
    }

    return activeCount;
  }

  //====================================================================
  // CONNECTION CONTEXT UPDATES
  //====================================================================
  updateConnectionContext(connectionId: string, updates: Partial<ConnectionContext>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.context = { ...connection.context, ...updates };

    wsLogger.debug('Connection context updated', {
      connectionId,
      updates,
      newContext: connection.context,
    });

    return true;
  }

  //====================================================================
  // HEARTBEAT MANAGEMENT
  //====================================================================
  markAlive(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.isAlive = true;
    connection.lastPing = Date.now();

    return true;
  }

  markDead(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.isAlive = false;

    return true;
  }

  //====================================================================
  // HEARTBEAT CHECK
  //====================================================================
  performHeartbeatCheck(timeoutMs: number = 30000): string[] {
    const now = Date.now();
    const deadConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastPing = now - connection.lastPing;

      if (timeSinceLastPing > timeoutMs) {
        deadConnections.push(connectionId);
        this.markDead(connectionId);

        wsLogger.warn('Connection marked as dead due to heartbeat timeout', {
          connectionId,
          userId: connection.context.userId,
          timeSinceLastPing,
          timeoutMs,
        });
      }
    }

    return deadConnections;
  }

  //====================================================================
  // CLEANUP METHODS
  //====================================================================
  cleanupDeadConnections(): number {
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections) {
      if (!connection.isAlive || connection.ws.readyState !== connection.ws.OPEN) {
        try {
          if (connection.ws.readyState === connection.ws.OPEN) {
            connection.ws.close();
          }
        } catch (error) {
          wsLogger.error('Error closing dead connection', error instanceof Error ? error : new Error('Unknown close error'), {
            connectionId,
          });
        }

        this.removeConnection(connectionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      wsLogger.info('Cleaned up dead connections', {
        cleanedCount,
        remainingConnections: this.connections.size,
      });
    }

    return cleanedCount;
  }


  public getDeadConnections(): string[] {
    const dead: string[] = [];
    for (const [connectionId, connection] of this.connections.entries()) {
      if (!connection.isAlive) {
        dead.push(connectionId);
      }
    }
    return dead;
  }
  //====================================================================
  // UTILITY METHODS
  //====================================================================
  getConnectionsByRoom(roomId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.context.roomId === roomId
    );
  }

  getConnectionsByServerId(serverId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.context.serverId === serverId
    );
  }

  //====================================================================
  // STATISTICS
  //====================================================================
  getConnectionStats(): {
    total: number;
    alive: number;
    dead: number;
    byRoom: Record<string, number>;
    byServer: Record<string, number>;
  } {
    const stats = {
      total: 0,
      alive: 0,
      dead: 0,
      byRoom: {} as Record<string, number>,
      byServer: {} as Record<string, number>,
    };

    for (const connection of this.connections.values()) {
      stats.total++;

      if (connection.isAlive) {
        stats.alive++;
      } else {
        stats.dead++;
      }

      // Count by room
      if (connection.context.roomId) {
        stats.byRoom[connection.context.roomId] = (stats.byRoom[connection.context.roomId] || 0) + 1;
      }

      // Count by server
      stats.byServer[connection.context.serverId] = (stats.byServer[connection.context.serverId] || 0) + 1;
    }

    return stats;
  }

  //====================================================================
  // GRACEFUL SHUTDOWN
  //====================================================================
  async shutdown(): Promise<void> {
    wsLogger.info('Starting ConnectionManager shutdown', {
      totalConnections: this.connections.size,
    });

    const closePromises: Promise<void>[] = [];

    for (const [connectionId, connection] of this.connections) {
      const closePromise = new Promise<void>((resolve) => {
        if (connection.ws.readyState === connection.ws.OPEN) {
          connection.ws.close(1000, 'Server shutdown');

          connection.ws.once('close', () => {
            wsLogger.debug('Connection closed during shutdown', { connectionId });
            resolve();
          });

          // Timeout for graceful close
          setTimeout(() => {
            if (connection.ws.readyState !== connection.ws.CLOSED) {
              connection.ws.terminate();
              wsLogger.warn('Connection forcefully terminated during shutdown', { connectionId });
            }
            resolve();
          }, 5000);
        } else {
          resolve();
        }
      });

      closePromises.push(closePromise);
    }

    // Wait for all connections to close
    await Promise.all(closePromises);

    // Clear all connections
    this.connections.clear();

    wsLogger.info('ConnectionManager shutdown completed');
  }
}