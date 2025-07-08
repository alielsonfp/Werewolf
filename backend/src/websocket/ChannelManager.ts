// 👥 LOBISOMEM ONLINE - Channel Manager (MODIFICAÇÕES A10)
// Localização: backend/src/websocket/ChannelManager.ts
// ADICIONAR ESTAS FUNCIONALIDADES AO ChannelManager EXISTENTE

import WebSocket from 'ws';
import { wsLogger } from '@/utils/logger';
import type { ConnectionManager } from './ConnectionManager';

// Interface para gerenciar canais com espectadores
interface EnhancedChannel {
  players: Set<string>;
  spectators: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

export class ChannelManager {
  private channels = new Map<string, EnhancedChannel>();
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * A10.1 - Adiciona espectador a uma sala
   */
  addSpectator(roomId: string, connectionId: string): boolean {
    try {
      const connection = this.connectionManager.getConnection(connectionId);
      if (!connection) {
        wsLogger.warn('Attempted to add spectator with invalid connection', {
          roomId,
          connectionId
        });
        return false;
      }

      // Cria canal se não existir
      if (!this.channels.has(roomId)) {
        this.channels.set(roomId, {
          players: new Set(),
          spectators: new Set(),
          createdAt: new Date(),
          lastActivity: new Date()
        });
      }

      const channel = this.channels.get(roomId)!;

      // Verifica se já está como jogador
      if (channel.players.has(connectionId)) {
        wsLogger.warn('Connection already in room as player', {
          roomId,
          connectionId,
          userId: connection.context.userId
        });
        return false;
      }

      // Adiciona como espectador
      channel.spectators.add(connectionId);
      channel.lastActivity = new Date();

      wsLogger.info('Spectator added to channel', {
        roomId,
        connectionId,
        userId: connection.context.userId,
        spectatorCount: channel.spectators.size,
        playerCount: channel.players.size
      });

      return true;

    } catch (error) {
      wsLogger.error('Error adding spectator to channel', error instanceof Error ? error : new Error('Unknown error'), {
        roomId,
        connectionId
      });
      return false;
    }
  }

  /**
   * A10.1 - Remove espectador de uma sala
   */
  removeSpectator(roomId: string, connectionId: string): boolean {
    try {
      const channel = this.channels.get(roomId);
      if (!channel) {
        wsLogger.warn('Attempted to remove spectator from non-existent channel', {
          roomId,
          connectionId
        });
        return false;
      }

      const wasRemoved = channel.spectators.delete(connectionId);
      if (wasRemoved) {
        channel.lastActivity = new Date();

        // Remove canal se vazio
        if (channel.players.size === 0 && channel.spectators.size === 0) {
          this.channels.delete(roomId);
          wsLogger.info('Empty channel removed', { roomId });
        }

        const connection = this.connectionManager.getConnection(connectionId);
        wsLogger.info('Spectator removed from channel', {
          roomId,
          connectionId,
          userId: connection?.context.userId,
          remainingSpectators: channel.spectators.size,
          playerCount: channel.players.size
        });
      }

      return wasRemoved;

    } catch (error) {
      wsLogger.error('Error removing spectator from channel', error instanceof Error ? error : new Error('Unknown error'), {
        roomId,
        connectionId
      });
      return false;
    }
  }

  /**
   * A10.1 - Obtém contagem de espectadores em uma sala
   */
  getSpectatorCount(roomId: string): number {
    const channel = this.channels.get(roomId);
    return channel ? channel.spectators.size : 0;
  }

  /**
   * A10.1 - Obtém lista de IDs dos espectadores
   */
  getSpectatorIds(roomId: string): string[] {
    const channel = this.channels.get(roomId);
    return channel ? Array.from(channel.spectators) : [];
  }

  /**
   * A10.1 - Faz broadcast apenas para espectadores
   */
  broadcastToSpectators(roomId: string, type: string, data?: any): number {
    const channel = this.channels.get(roomId);
    if (!channel || channel.spectators.size === 0) {
      return 0;
    }

    let sentCount = 0;
    const message = JSON.stringify({ type, data });

    for (const connectionId of channel.spectators) {
      const connection = this.connectionManager.getConnection(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(message);
          sentCount++;
        } catch (error) {
          wsLogger.warn('Failed to send message to spectator', {
            roomId,
            connectionId,
            type,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    if (sentCount > 0) {
      wsLogger.debug('Broadcast sent to spectators', {
        roomId,
        type,
        spectatorCount: channel.spectators.size,
        sentCount
      });
    }

    return sentCount;
  }

  /**
   * A10.1 - Faz broadcast apenas para jogadores (não espectadores)
   */
  broadcastToPlayers(roomId: string, type: string, data?: any, excludeConnectionId?: string): number {
    const channel = this.channels.get(roomId);
    if (!channel || channel.players.size === 0) {
      return 0;
    }

    let sentCount = 0;
    const message = JSON.stringify({ type, data });

    for (const connectionId of channel.players) {
      if (excludeConnectionId && connectionId === excludeConnectionId) {
        continue;
      }

      const connection = this.connectionManager.getConnection(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(message);
          sentCount++;
        } catch (error) {
          wsLogger.warn('Failed to send message to player', {
            roomId,
            connectionId,
            type,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    if (sentCount > 0) {
      wsLogger.debug('Broadcast sent to players', {
        roomId,
        type,
        playerCount: channel.players.size,
        sentCount
      });
    }

    return sentCount;
  }

  /**
   * Broadcast para toda a sala (players + spectators)
   */
  broadcastToRoom(roomId: string, type: string, data?: any, excludeConnectionId?: string): number {
    const playersCount = this.broadcastToPlayers(roomId, type, data, excludeConnectionId);
    const spectatorsCount = this.broadcastToSpectators(roomId, type, data);

    return playersCount + spectatorsCount;
  }

  /**
   * A10.1 - Obtém estatísticas da sala
   */
  getRoomStats(roomId: string): {
    exists: boolean;
    playerCount: number;
    spectatorCount: number;
    totalConnections: number;
    createdAt?: Date;
    lastActivity?: Date;
  } {
    const channel = this.channels.get(roomId);

    if (!channel) {
      return {
        exists: false,
        playerCount: 0,
        spectatorCount: 0,
        totalConnections: 0
      };
    }

    return {
      exists: true,
      playerCount: channel.players.size,
      spectatorCount: channel.spectators.size,
      totalConnections: channel.players.size + channel.spectators.size,
      createdAt: channel.createdAt,
      lastActivity: channel.lastActivity
    };
  }

  /**
   * Obtém conexões de jogadores de uma sala
   */
  getRoomPlayerConnections(roomId: string): Set<string> {
    const channel = this.channels.get(roomId);
    return channel ? new Set(channel.players) : new Set();
  }

  /**
   * Obtém conexões de espectadores de uma sala
   */
  getRoomSpectatorConnections(roomId: string): Set<string> {
    const channel = this.channels.get(roomId);
    return channel ? new Set(channel.spectators) : new Set();
  }

  /**
   * MODIFICAÇÃO do joinChannel existente para suportar tipos
   */
  joinChannel(connectionId: string, channelId: string, asSpectator: boolean = false): void {
    if (asSpectator) {
      this.addSpectator(channelId, connectionId);
    } else {
      // Lógica original do joinChannel para jogadores
      if (!this.channels.has(channelId)) {
        this.channels.set(channelId, {
          players: new Set(),
          spectators: new Set(),
          createdAt: new Date(),
          lastActivity: new Date()
        });
      }

      const channel = this.channels.get(channelId)!;

      // Remove de espectadores se estava lá
      channel.spectators.delete(connectionId);

      // Adiciona como jogador
      channel.players.add(connectionId);
      channel.lastActivity = new Date();

      const connection = this.connectionManager.getConnection(connectionId);
      wsLogger.info('Player joined channel', {
        channelId,
        connectionId,
        userId: connection?.context.userId,
        playerCount: channel.players.size,
        spectatorCount: channel.spectators.size
      });
    }
  }

  /**
   * MODIFICAÇÃO do leaveChannel existente
   */
  leaveChannel(connectionId: string, channelId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    const wasPlayer = channel.players.delete(connectionId);
    const wasSpectator = channel.spectators.delete(connectionId);

    if (wasPlayer || wasSpectator) {
      channel.lastActivity = new Date();

      // Remove canal se vazio
      if (channel.players.size === 0 && channel.spectators.size === 0) {
        this.channels.delete(channelId);
        wsLogger.info('Empty channel removed', { channelId });
      }

      const connection = this.connectionManager.getConnection(connectionId);
      wsLogger.info('Connection left channel', {
        channelId,
        connectionId,
        userId: connection?.context.userId,
        wasPlayer,
        wasSpectator,
        remainingPlayers: channel.players.size,
        remainingSpectators: channel.spectators.size
      });
    }
  }

  /**
   * Remove conexão de todas as salas
   */
  removeConnectionFromAllRooms(connectionId: string): void {
    for (const [roomId, channel] of this.channels.entries()) {
      const wasPlayer = channel.players.delete(connectionId);
      const wasSpectator = channel.spectators.delete(connectionId);

      if (wasPlayer || wasSpectator) {
        channel.lastActivity = new Date();

        // Remove canal se vazio
        if (channel.players.size === 0 && channel.spectators.size === 0) {
          this.channels.delete(roomId);
          wsLogger.info('Empty channel removed during cleanup', { roomId });
        }

        const connection = this.connectionManager.getConnection(connectionId);
        wsLogger.info('Connection removed from all rooms', {
          roomId,
          connectionId,
          userId: connection?.context.userId,
          wasPlayer,
          wasSpectator
        });
      }
    }
  }

  /**
   * Verifica se conexão é espectador em uma sala
   */
  isSpectator(connectionId: string, roomId: string): boolean {
    const channel = this.channels.get(roomId);
    return channel ? channel.spectators.has(connectionId) : false;
  }

  /**
   * Verifica se conexão é jogador em uma sala
   */
  isPlayer(connectionId: string, roomId: string): boolean {
    const channel = this.channels.get(roomId);
    return channel ? channel.players.has(connectionId) : false;
  }

  /**
   * Move espectador para jogador
   */
  promoteSpectatorToPlayer(connectionId: string, roomId: string): boolean {
    const channel = this.channels.get(roomId);
    if (!channel || !channel.spectators.has(connectionId)) {
      return false;
    }

    channel.spectators.delete(connectionId);
    channel.players.add(connectionId);
    channel.lastActivity = new Date();

    const connection = this.connectionManager.getConnection(connectionId);
    wsLogger.info('Spectator promoted to player', {
      roomId,
      connectionId,
      userId: connection?.context.userId,
      playerCount: channel.players.size,
      spectatorCount: channel.spectators.size
    });

    return true;
  }

  /**
   * Move jogador para espectador
   */
  demotePlayerToSpectator(connectionId: string, roomId: string): boolean {
    const channel = this.channels.get(roomId);
    if (!channel || !channel.players.has(connectionId)) {
      return false;
    }

    channel.players.delete(connectionId);
    channel.spectators.add(connectionId);
    channel.lastActivity = new Date();

    const connection = this.connectionManager.getConnection(connectionId);
    wsLogger.info('Player demoted to spectator', {
      roomId,
      connectionId,
      userId: connection?.context.userId,
      playerCount: channel.players.size,
      spectatorCount: channel.spectators.size
    });

    return true;
  }

  /**
   * Obtém estatísticas gerais
   */
  getGlobalStats(): {
    totalChannels: number;
    totalPlayers: number;
    totalSpectators: number;
    totalConnections: number;
    averagePlayersPerRoom: number;
    averageSpectatorsPerRoom: number;
  } {
    let totalPlayers = 0;
    let totalSpectators = 0;

    for (const channel of this.channels.values()) {
      totalPlayers += channel.players.size;
      totalSpectators += channel.spectators.size;
    }

    const totalChannels = this.channels.size;

    return {
      totalChannels,
      totalPlayers,
      totalSpectators,
      totalConnections: totalPlayers + totalSpectators,
      averagePlayersPerRoom: totalChannels > 0 ? totalPlayers / totalChannels : 0,
      averageSpectatorsPerRoom: totalChannels > 0 ? totalSpectators / totalChannels : 0
    };
  }

  /**
   * Lista todas as salas com informações
   */
  getAllRooms(): Array<{
    roomId: string;
    playerCount: number;
    spectatorCount: number;
    totalConnections: number;
    createdAt: Date;
    lastActivity: Date;
  }> {
    return Array.from(this.channels.entries()).map(([roomId, channel]) => ({
      roomId,
      playerCount: channel.players.size,
      spectatorCount: channel.spectators.size,
      totalConnections: channel.players.size + channel.spectators.size,
      createdAt: channel.createdAt,
      lastActivity: channel.lastActivity
    }));
  }

  public getActiveRoomsCount(): number {
    return this.channels.size;
  }

  /**
   * Cleanup para shutdown
   */
  cleanup(): void {
    this.channels.clear();
    wsLogger.info('ChannelManager cleanup completed');
  }
}