import { wsLogger } from '@/utils/logger';
import type { ConnectionManager } from './ConnectionManager';

interface RoomChannel {
  players: Set<string>;
  spectators: Set<string>;
  readyPlayers: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

export class ChannelManager {
  private rooms = new Map<string, RoomChannel>();
  private connectionRooms = new Map<string, string>();

  constructor(private connectionManager: ConnectionManager) { }

  createRoom(roomId: string): boolean {
    if (this.rooms.has(roomId)) {
      wsLogger.warn('Attempted to create existing room channel', { roomId });
      return false;
    }

    this.rooms.set(roomId, {
      players: new Set(),
      spectators: new Set(),
      readyPlayers: new Set(),
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    wsLogger.info('Room channel created', { roomId });
    return true;
  }

  joinRoom(roomId: string, connectionId: string, asSpectator = false): boolean {
    console.log('🏠 [ChannelManager-JOIN] Iniciando processo', {
      roomId: roomId.slice(-6),
      connectionId: connectionId.slice(-6),
      asSpectator,
      timestamp: new Date().toISOString()
    });

    let room = this.rooms.get(roomId);

    if (!room) {
      console.log('🏠 [ChannelManager-JOIN] Sala não existe, criando nova', { roomId: roomId.slice(-6) });
      this.createRoom(roomId);
      room = this.rooms.get(roomId)!;
    } else {
      console.log('🏠 [ChannelManager-JOIN] Sala já existe', {
        roomId: roomId.slice(-6),
        currentPlayers: room.players.size,
        currentSpectators: room.spectators.size
      });
    }

    // ✅ SUSPEITO #1: LOG DETALHADO DO LEAVE AUTOMÁTICO
    const currentRoom = this.connectionRooms.get(connectionId);
    if (currentRoom === roomId) {
      console.log('🔄 [ChannelManager-JOIN] Conexão já está na mesma sala, ignorando', {
        connectionId: connectionId.slice(-6),
        roomId: roomId.slice(-6)
      });
      return true; // Já está na sala certa, não precisa fazer nada
    }

    if (currentRoom && currentRoom !== roomId) {
      console.log('🔄 [ChannelManager-JOIN] Conexão mudando de sala', {
        connectionId: connectionId.slice(-6),
        fromRoom: currentRoom.slice(-6),
        toRoom: roomId.slice(-6)
      });
      this.leaveRoom(currentRoom, connectionId);
    }

    // ✅ ADICIONAR À SALA
    if (asSpectator) {
      room.spectators.add(connectionId);
      console.log('👁️ [ChannelManager-JOIN] Adicionado como spectator', {
        connectionId: connectionId.slice(-6),
        roomId: roomId.slice(-6),
        totalSpectators: room.spectators.size
      });
    } else {
      room.players.add(connectionId);
      console.log('👤 [ChannelManager-JOIN] Adicionado como player', {
        connectionId: connectionId.slice(-6),
        roomId: roomId.slice(-6),
        totalPlayers: room.players.size
      });
    }

    this.connectionRooms.set(connectionId, roomId);
    room.lastActivity = new Date();

    console.log('✅ [ChannelManager-JOIN] Processo concluído', {
      connectionId: connectionId.slice(-6),
      roomId: roomId.slice(-6),
      finalPlayers: room.players.size,
      finalSpectators: room.spectators.size,
      connectionMapped: this.connectionRooms.has(connectionId)
    });

    wsLogger.debug('Connection joined room', {
      connectionId,
      roomId,
      asSpectator,
      totalPlayers: room.players.size,
      totalSpectators: room.spectators.size,
    });

    return true;
  }

  leaveRoom(roomId: string, connectionId: string): boolean {
    console.log('🚪 [ChannelManager-LEAVE] Iniciando processo', {
      roomId: roomId.slice(-6),
      connectionId: connectionId.slice(-6),
      timestamp: new Date().toISOString()
    });

    const room = this.rooms.get(roomId);
    if (!room) {
      console.log('🚪 [ChannelManager-LEAVE] Sala não existe!', {
        roomId: roomId.slice(-6),
        connectionId: connectionId.slice(-6)
      });
      wsLogger.warn('Attempted to leave non-existent room', { roomId, connectionId });
      return false;
    }

    const wasPlayer = room.players.delete(connectionId);
    const wasSpectator = room.spectators.delete(connectionId);

    console.log('🚪 [ChannelManager-LEAVE] Remoção das listas', {
      connectionId: connectionId.slice(-6),
      roomId: roomId.slice(-6),
      wasPlayer,
      wasSpectator,
      remainingPlayers: room.players.size,
      remainingSpectators: room.spectators.size
    });

    if (!wasPlayer && !wasSpectator) {
      console.log('🚪 [ChannelManager-LEAVE] Conexão não estava na sala!', {
        roomId: roomId.slice(-6),
        connectionId: connectionId.slice(-6)
      });
      wsLogger.warn('Connection was not in room', { roomId, connectionId });
      return false;
    }

    this.connectionRooms.delete(connectionId);
    room.lastActivity = new Date();

    // ✅ LOG CRÍTICO: QUANDO SALA FICA VAZIA
    if (room.players.size === 0 && room.spectators.size === 0) {
      console.log('🗑️ [ChannelManager-LEAVE] Sala ficou vazia, removendo', {
        roomId: roomId.slice(-6),
        connectionId: connectionId.slice(-6)
      });
      this.rooms.delete(roomId);
      wsLogger.info('Room channel removed (empty)', { roomId });
    }

    console.log('✅ [ChannelManager-LEAVE] Processo concluído', {
      connectionId: connectionId.slice(-6),
      roomId: roomId.slice(-6),
      wasPlayer,
      wasSpectator,
      roomStillExists: this.rooms.has(roomId)
    });

    wsLogger.debug('Connection left room', {
      connectionId,
      roomId,
      wasPlayer,
      wasSpectator,
      remainingPlayers: room.players.size,
      remainingSpectators: room.spectators.size,
    });

    return true;
  }

  removeConnectionFromAllRooms(connectionId: string): void {
    const roomId = this.connectionRooms.get(connectionId);
    if (roomId) {
      this.leaveRoom(roomId, connectionId);
    }
  }

  getRoomConnections(roomId: string): Set<string> {
    const room = this.rooms.get(roomId);
    if (!room) return new Set();
    return new Set([...room.players, ...room.spectators]);
  }

  getRoomPlayerConnections(roomId: string): Set<string> {
    const room = this.rooms.get(roomId);
    return room ? new Set(room.players) : new Set();
  }

  getRoomSpectatorConnections(roomId: string): Set<string> {
    const room = this.rooms.get(roomId);
    return room ? new Set(room.spectators) : new Set();
  }

  getConnectionRoom(connectionId: string): string | undefined {
    return this.connectionRooms.get(connectionId);
  }

  getRoomCount(roomId: string): { players: number; spectators: number } {
    const room = this.rooms.get(roomId);
    if (!room) return { players: 0, spectators: 0 };

    return {
      players: room.players.size,
      spectators: room.spectators.size,
    };
  }

  // 🔧 NOVA VERSÃO: limpa conexões mortas automaticamente
  getRoomStats(roomId: string): { playersCount: number; spectatorsCount: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    console.log(`\n🔍 DEBUG LOBBY - Sala: ${roomId.slice(-6)}`);
    console.log(`📊 Players no Set: ${room.players.size}`);

    const deadPlayers = new Set<string>();
    const deadSpectators = new Set<string>();

    // Verificar players
    for (const connectionId of room.players) {
      const connection = this.connectionManager.getConnection(connectionId);
      const isValid = connection && connection.ws.readyState === connection.ws.OPEN;

      console.log(`   👤 ${connectionId.slice(-6)}: ${isValid ? '✅ VIVO' : '💀 MORTO'}`);

      if (!isValid) {
        deadPlayers.add(connectionId);
        this.connectionRooms.delete(connectionId);
      }
    }

    // Verificar spectators
    for (const connectionId of room.spectators) {
      const connection = this.connectionManager.getConnection(connectionId);
      const isValid = connection && connection.ws.readyState === connection.ws.OPEN;

      if (!isValid) {
        deadSpectators.add(connectionId);
        this.connectionRooms.delete(connectionId);
      }
    }

    // Limpeza efetiva
    if (deadPlayers.size > 0) {
      console.log(`🧹 Limpando ${deadPlayers.size} players mortos`);
      for (const deadId of deadPlayers) {
        room.players.delete(deadId);
      }
    }

    if (deadSpectators.size > 0) {
      console.log(`🧹 Limpando ${deadSpectators.size} spectators mortos`);
      for (const deadId of deadSpectators) {
        room.spectators.delete(deadId);
      }
    }

    const finalCount = {
      playersCount: room.players.size,
      spectatorsCount: room.spectators.size,
    };

    console.log(
      `📊 APÓS LIMPEZA: ${finalCount.playersCount} players, ${finalCount.spectatorsCount} spectators`,
    );

    room.lastActivity = new Date();

    if (finalCount.playersCount === 0 && finalCount.spectatorsCount === 0) {
      console.log(`🗑️ Sala ${roomId.slice(-6)} ficou vazia, removendo`);
      this.rooms.delete(roomId);
    }

    return finalCount;
  }

  broadcastToRoom(
    roomId: string,
    type: string,
    data?: any,
    excludeConnectionId?: string,
  ): number {
    const connections = this.getRoomConnections(roomId);
    let sent = 0;

    for (const connectionId of connections) {
      if (connectionId === excludeConnectionId) continue;

      const connection = this.connectionManager.getConnection(connectionId);
      if (!connection || connection.ws.readyState !== connection.ws.OPEN) continue;

      try {
        connection.ws.send(
          JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString(),
          }),
        );
        sent++;
      } catch (error) {
        wsLogger.error(
          'Failed to broadcast to connection',
          error instanceof Error ? error : new Error('Unknown broadcast error'),
          {
            connectionId,
            roomId,
            type,
          },
        );
      }
    }

    wsLogger.debug('Broadcast to room completed', {
      roomId,
      type,
      totalConnections: connections.size,
      sentCount: sent,
      excluded: !!excludeConnectionId,
    });

    return sent;
  }

  isPlayerInRoom(roomId: string, connectionId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.players.has(connectionId) : false;
  }

  isSpectatorInRoom(roomId: string, connectionId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.spectators.has(connectionId) : false;
  }

  // ✅ Define ou remove o status de "pronto" de um jogador
  setPlayerReadyStatus(roomId: string, connectionId: string, isReady: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (!room.readyPlayers) room.readyPlayers = new Set();

    if (isReady) {
      room.readyPlayers.add(connectionId);
    } else {
      room.readyPlayers.delete(connectionId);
    }

    wsLogger.debug('Player ready status updated', {
      roomId,
      connectionId,
      isReady,
      totalReady: room.readyPlayers.size,
    });

    room.lastActivity = new Date();
  }

  // ✅ Verifica se um jogador está marcado como "pronto"
  isPlayerReady(roomId: string, connectionId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.readyPlayers?.has(connectionId) ?? false : false;
  }

  getActiveRoomsCount(): number {
    return this.rooms.size;
  }

  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  getRoomInfo(roomId: string): {
    exists: boolean;
    playersCount: number;
    spectatorsCount: number;
    createdAt?: Date;
    lastActivity?: Date;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { exists: false, playersCount: 0, spectatorsCount: 0 };
    }

    return {
      exists: true,
      playersCount: room.players.size,
      spectatorsCount: room.spectators.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };
  }

  cleanup(maxIdleTime = 3_600_000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      const idleTime = now - room.lastActivity.getTime();

      if (room.players.size === 0 && room.spectators.size === 0 && idleTime > maxIdleTime) {
        this.rooms.delete(roomId);
        cleaned++;

        wsLogger.info('Cleaned up idle room channel', {
          roomId,
          idleTime: Math.floor(idleTime / 1000),
          maxIdleTime: Math.floor(maxIdleTime / 1000),
        });
      }
    }

    return cleaned;
  }

  clear(): void {
    this.rooms.clear();
    this.connectionRooms.clear();
    wsLogger.info('All room channels cleared');
  }

  getStats(): {
    totalRooms: number;
    totalConnections: number;
    totalPlayers: number;
    totalSpectators: number;
    roomsInfo: Array<{
      roomId: string;
      players: number;
      spectators: number;
      idleTime: number;
    }>;
  } {
    let totalPlayers = 0;
    let totalSpectators = 0;
    const roomsInfo: Array<{
      roomId: string;
      players: number;
      spectators: number;
      idleTime: number;
    }> = [];

    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      totalPlayers += room.players.size;
      totalSpectators += room.spectators.size;

      roomsInfo.push({
        roomId,
        players: room.players.size,
        spectators: room.spectators.size,
        idleTime: Math.floor((now - room.lastActivity.getTime()) / 1000),
      });
    }

    return {
      totalRooms: this.rooms.size,
      totalConnections: this.connectionRooms.size,
      totalPlayers,
      totalSpectators,
      roomsInfo,
    };
  }
}