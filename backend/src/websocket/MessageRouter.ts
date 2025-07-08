// 🐺 LOBISOMEM ONLINE - Message Router (CORRIGIDO E UNIFICADO)
import { Player } from '@/game/Game';
import { wsLogger } from '@/utils/logger';
import { validateWebSocketMessage } from '@/utils/simpleValidators';
import { pool } from '@/config/database';
import type { ConnectionManager } from './ConnectionManager';
import type { ChannelManager } from './ChannelManager';
import type { IGameStateService, IEventBus, WebSocketErrorCode, GameState } from '@/types';

// ====================================================================
// NOTA IMPORTANTE:
// Para que os erros de tipo em 'sendError' desapareçam, certifique-se
// de que os seguintes códigos foram adicionados ao tipo 'WebSocketErrorCode'
// no arquivo 'backend/src/types/index.ts':
// 'ROOM_NOT_JOINABLE', 'DELETE_ROOM_FAILED', 'INVALID_CONNECTION',
// 'RECONNECT_FAILED', 'NOT_SPECTATING', 'ALREADY_IN_ROOM'
// ====================================================================


//====================================================================
// MESSAGE HANDLER TYPE
//====================================================================
type MessageHandler = (connectionId: string, data: any) => Promise<void>;

//====================================================================
// MESSAGE ROUTER CLASS
//====================================================================
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();
  private broadcastToRoom: ((roomId: string, type: string, data?: any, excludeConnectionId?: string) => number) | null = null;
  private sendToUser: ((userId: string, type: string, data?: any) => boolean) | null = null;

  constructor(
    private connectionManager: ConnectionManager,
    private channelManager: ChannelManager,
    private gameStateService: IGameStateService,
    private eventBus: IEventBus
  ) {
    this.setupHandlers();
  }

  //====================================================================
  // SETUP MESSAGE HANDLERS
  //====================================================================
  private setupHandlers(): void {
    // Connection management
    this.handlers.set('ping', this.handlePing.bind(this));
    this.handlers.set('pong', this.handlePong.bind(this));
    this.handlers.set('heartbeat', this.handleHeartbeat.bind(this));

    // Room management
    this.handlers.set('join-room', this.handleJoinRoom.bind(this));
    this.handlers.set('leave-room', this.handleLeaveRoom.bind(this));
    this.handlers.set('player-ready', this.handlePlayerReady.bind(this));
    this.handlers.set('start-game', this.handleStartGame.bind(this));
    this.handlers.set('delete-room', this.handleDeleteRoom.bind(this));

    // Sistema de votação
    this.handlers.set('vote', this.handleVote.bind(this));
    this.handlers.set('unvote', this.handleUnvote.bind(this));

    // Game actions
    this.handlers.set('game-action', this.handleGameAction.bind(this));
    this.handlers.set('night-action', this.handleNightAction.bind(this));

    // Additional handlers
    this.handlers.set('kick-player', this.handleKickPlayer.bind(this));
    this.handlers.set('chat-message', this.handleChatMessage.bind(this));

    // Administrative handlers
    this.handlers.set('force-phase', this.handleForcePhase.bind(this));
    this.handlers.set('get-game-state', this.handleGetGameState.bind(this));

    // Handlers da A10 integrados e corrigidos
    this.handlers.set('reconnect', this.handleReconnect.bind(this));
    this.handlers.set('ping-activity', this.handleActivityPing.bind(this));
    this.handlers.set('spectate-room', this.handleSpectateRoom.bind(this));
    this.handlers.set('stop-spectating', this.handleStopSpectating.bind(this));
    this.handlers.set('get-room-state', this.handleGetRoomState.bind(this));
    this.handlers.set('spectator-chat', this.handleSpectatorChat.bind(this));

    wsLogger.debug('All message handlers setup completed', {
      handlerCount: this.handlers.size,
      handlers: Array.from(this.handlers.keys()),
    });
  }

  //====================================================================
  // SET BROADCAST METHODS (Called by WebSocketManager)
  //====================================================================
  setBroadcastMethods(
    broadcastToRoom: (roomId: string, type: string, data?: any, excludeConnectionId?: string) => number,
    sendToUser: (userId: string, type: string, data?: any) => boolean
  ): void {
    this.broadcastToRoom = broadcastToRoom;
    this.sendToUser = sendToUser;
  }

  //====================================================================
  // MAIN MESSAGE HANDLER
  //====================================================================
  async handleMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      wsLogger.warn('Message received for non-existent connection', { connectionId });
      return;
    }

    try {
      const validation = validateWebSocketMessage(message);
      if (!validation.success) {
        await this.sendError(connectionId, 'INVALID_MESSAGE', validation.error || 'Invalid message format');
        return;
      }

      const validMessage = validation.data!;
      this.connectionManager.updateActivity(connectionId);

      wsLogger.debug('Message received', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        type: validMessage.type,
        roomId: connection.context.roomId,
      });

      const handler = this.handlers.get(validMessage.type);
      if (!handler) {
        await this.sendError(connectionId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${validMessage.type}`);
        return;
      }

      await handler(connectionId, validMessage.data || {});

    } catch (error) {
      wsLogger.error('Error handling message', error instanceof Error ? error : new Error('Unknown message error'), {
        connectionId,
        userId: connection.context.userId,
        messageType: message?.type,
      });

      await this.sendError(connectionId, 'HANDLER_ERROR', 'Internal error processing message');
    }
  }

  //====================================================================
  // CONNECTION HANDLERS
  //====================================================================
  private async handlePing(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    try {
      connection.ws.send(JSON.stringify({
        type: 'pong',
        data: { timestamp: Date.now() },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      wsLogger.error('Failed to send pong', error instanceof Error ? error : new Error('Unknown pong error'), { connectionId });
    }
  }

  private async handlePong(connectionId: string, data: any): Promise<void> {
    this.connectionManager.updateActivity(connectionId);
  }

  private async handleHeartbeat(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    this.connectionManager.updateActivity(connectionId);

    try {
      connection.ws.send(JSON.stringify({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      wsLogger.error('Failed to send heartbeat response', error instanceof Error ? error : new Error('Unknown heartbeat error'), { connectionId });
    }
  }

  //====================================================================
  // ROOM HANDLERS
  //====================================================================
  private async handleJoinRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { roomId, asSpectator = false } = data;

    if (!roomId || typeof roomId !== 'string') {
      await this.sendError(connectionId, 'MISSING_ROOM_ID', 'Room ID is required and must be a string');
      return;
    }

    try {
      const roomQuery = `
        SELECT r.*, u.username as "hostUsername"
        FROM rooms r
        JOIN users u ON r."hostId" = u.id
        WHERE r.id = $1
      `;
      const roomResult = await pool.query(roomQuery, [roomId]);

      if (roomResult.rows.length === 0) {
        await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }

      const roomData = roomResult.rows[0];

      if (roomData.status !== 'WAITING') {
        await this.sendError(connectionId, 'ROOM_NOT_JOINABLE' as any, 'Room is not accepting new players');
        return;
      }

      this.channelManager.joinChannel(connectionId, roomId, asSpectator);

      connection.context.roomId = roomId;
      connection.isSpectator = asSpectator;

      const playerConnections = this.channelManager.getRoomPlayerConnections(roomId);
      const spectatorConnections = this.channelManager.getRoomSpectatorConnections(roomId);

      const players: any[] = [];
      for (const connId of playerConnections) {
        const conn = this.connectionManager.getConnection(connId);
        if (conn) {
          players.push({
            id: `${roomId}-${conn.context.userId}`,
            userId: conn.context.userId,
            username: conn.context.username,
            avatar: null,
            isHost: roomData.hostId === conn.context.userId,
            isReady: false,
            isSpectator: false,
            isConnected: true,
          });
        }
      }

      const spectators: any[] = [];
      for (const connId of spectatorConnections) {
        const conn = this.connectionManager.getConnection(connId);
        if (conn) {
          spectators.push({
            userId: conn.context.userId,
            username: conn.context.username,
          });
        }
      }

      const player = {
        id: `${roomId}-${connection.context.userId}`,
        userId: connection.context.userId,
        username: connection.context.username,
        avatar: null,
        isHost: roomData.hostId === connection.context.userId,
        isReady: false,
        isSpectator: asSpectator,
        isConnected: true,
      };

      await this.sendToConnection(connectionId, 'room-joined', {
        room: {
          id: roomData.id,
          name: roomData.name,
          code: roomData.code,
          isPrivate: roomData.isPrivate,
          maxPlayers: roomData.maxPlayers,
          maxSpectators: roomData.maxSpectators,
          status: roomData.status,
          hostId: roomData.hostId,
          hostUsername: roomData.hostUsername,
          currentPlayers: players.length,
          currentSpectators: spectators.length,
        },
        players,
        spectators,
        player,
        yourRole: asSpectator ? 'SPECTATOR' : (player.isHost ? 'HOST' : 'PLAYER'),
      });

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-joined', { player }, connectionId);
      }

      await this.eventBus.publish('room:player-joined', {
        roomId,
        userId: connection.context.userId,
        username: connection.context.username,
        asSpectator,
      });

      wsLogger.info('Player joined room', {
        userId: connection.context.userId,
        roomId,
        asSpectator,
      });

    } catch (error) {
      wsLogger.error('Error joining room', error instanceof Error ? error : new Error('Unknown join room error'), {
        connectionId,
        roomId,
      });
      await this.sendError(connectionId, 'JOIN_ROOM_FAILED', 'Internal error joining room');
    }
  }

  private async handleLeaveRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const roomId: string | undefined = connection.context.roomId;
    if (!roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Not currently in a room');
      return;
    }

    try {
      this.channelManager.leaveChannel(connectionId, roomId);

      // CORREÇÃO 1: Usar 'delete' em vez de atribuir 'undefined'.
      delete connection.context.roomId;
      connection.isSpectator = false;

      await this.sendToConnection(connectionId, 'room-left', { roomId });

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-left', {
          userId: connection.context.userId,
          username: connection.context.username,
        }, connectionId);
      }

      await this.eventBus.publish('room:player-left', {
        roomId,
        userId: connection.context.userId,
      });

      wsLogger.info('Player left room', { userId: connection.context.userId, roomId });

    } catch (error) {
      wsLogger.error('Error leaving room', error instanceof Error ? error : new Error('Unknown leave room error'), {
        connectionId,
        roomId,
      });
      await this.sendError(connectionId, 'LEAVE_ROOM_FAILED', 'Internal error leaving room');
    }
  }

  private async handleDeleteRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Not currently in a room');
      return;
    }

    const roomId = connection.context.roomId;

    try {
      const roomQuery = `SELECT id, "hostId" FROM rooms WHERE id = $1`;
      const roomResult = await pool.query(roomQuery, [roomId]);

      if (roomResult.rows.length === 0) {
        await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }

      const room = roomResult.rows[0];
      if (room.hostId !== connection.context.userId) {
        await this.sendError(connectionId, 'NOT_HOST', 'Only the host can delete the room');
        return;
      }

      const playerConnections = this.channelManager.getRoomPlayerConnections(roomId);
      const spectatorConnections = this.channelManager.getRoomSpectatorConnections(roomId);
      const allRoomConnections = new Set([...playerConnections, ...spectatorConnections]);

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'room-deleted', {
          roomId,
          reason: 'Host ended the room',
        });
      }

      for (const connId of allRoomConnections) {
        this.channelManager.leaveChannel(connId, roomId);
        const conn = this.connectionManager.getConnection(connId);
        if (conn) {
          // CORREÇÃO 2: Usar 'delete' em vez de atribuir 'undefined'.
          delete conn.context.roomId;
          conn.isSpectator = false;
        }
      }

      await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);

      await this.eventBus.publish('room:deleted', {
        roomId,
        hostId: connection.context.userId,
      });

      wsLogger.info('Room deleted by host', {
        hostId: connection.context.userId,
        roomId,
        affectedConnections: allRoomConnections.size,
      });

    } catch (error) {
      wsLogger.error('Error deleting room', error instanceof Error ? error : new Error('Unknown delete room error'), {
        connectionId,
        roomId,
      });
      await this.sendError(connectionId, 'DELETE_ROOM_FAILED' as any, 'Internal error deleting room');
    }
  }

  private async handlePlayerReady(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to set ready status');
      return;
    }

    const { ready } = data;
    if (typeof ready !== 'boolean') {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Ready status must be boolean');
      return;
    }

    try {
      const roomId = connection.context.roomId;

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-ready', {
          userId: connection.context.userId,
          username: connection.context.username,
          ready,
        });
      }

      await this.eventBus.publish('room:player-ready', {
        roomId,
        userId: connection.context.userId,
        ready,
      });

      wsLogger.info('Player ready status changed', { userId: connection.context.userId, roomId, ready });

    } catch (error) {
      wsLogger.error('Error updating ready status', error instanceof Error ? error : new Error('Unknown ready status error'), {
        connectionId,
        ready,
      });
      await this.sendError(connectionId, 'READY_UPDATE_FAILED', 'Failed to update ready status');
    }
  }

  private async handleStartGame(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to start game');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const playerConnections = this.channelManager.getRoomPlayerConnections(roomId);

      if (playerConnections.size < 6) {
        await this.sendError(connectionId, 'INVALID_ACTION', `Mínimo de 6 jogadores necessários. Atual: ${playerConnections.size}`);
        return;
      }

      const gameConfig = {
        roomId: roomId,
        maxPlayers: 15,
        maxSpectators: 5,
        nightDuration: 60000,
        dayDuration: 120000,
        votingDuration: 30000,
        allowReconnection: true,
        reconnectionTimeout: 120000,
      };

      const newGame = await this.gameStateService.createGame(connection.context.userId, gameConfig);
      const gameId = newGame.gameId;

      for (const connId of playerConnections) {
        const playerConn = this.connectionManager.getConnection(connId);
        if (playerConn) {
          const playerData = {
            userId: playerConn.context.userId,
            username: playerConn.context.username,
            isHost: playerConn.context.userId === newGame.hostId,
          };
          await this.gameStateService.addPlayer(gameId, playerData as any);
        }
      }

      wsLogger.info('All players data sent to game state service', { gameId, playerCount: playerConnections.size });

      const gameStarted = await this.gameStateService.startGame(gameId);

      if (!gameStarted) {
        wsLogger.error('Game failed to start, likely due to unmet requirements.', undefined, { gameId });
        await this.sendError(connectionId, 'START_GAME_FAILED', 'Game requirements not met. Check server logs.');
      }

    } catch (error) {
      wsLogger.error('Critical error in handleStartGame', error instanceof Error ? error : new Error('Unknown start game error'), { connectionId });
      await this.sendError(connectionId, 'START_GAME_FAILED', 'An internal error occurred while starting the game.');
    }
  }

  //====================================================================
  // VOTING HANDLERS
  //====================================================================
  private async getActiveGameForRoom(roomId: string): Promise<GameState | null> {
    const gamesInRoom = await this.gameStateService.getGamesByRoom(roomId);
    return gamesInRoom.find(g => g.status === 'PLAYING') || null;
  }

  private async handleVote(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to vote');
      return;
    }

    const { targetId } = data;
    if (!targetId || typeof targetId !== 'string') {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Target ID is required for voting');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const game = await this.getActiveGameForRoom(roomId);

      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      if (game.phase !== 'VOTING') {
        await this.sendError(connectionId, 'INVALID_PHASE', 'Voting is only allowed during voting phase');
        return;
      }

      const voterPlayer = game.players.find(p => p.userId === connection.context.userId);
      // O 'targetId' neste contexto é o userId, mas 'castVote' espera o playerId. Precisamos encontrar o player.
      const targetPlayer = game.players.find(p => p.userId === targetId);

      if (!voterPlayer || !targetPlayer) {
        await this.sendError(connectionId, 'PLAYER_NOT_FOUND', 'Voter or target not found in game state.');
        return;
      }

      // CORREÇÃO 3: Adicionar verificação antes de chamar o método opcional.
      if (this.gameStateService.castVote) {
        const success = await this.gameStateService.castVote(game.gameId, voterPlayer.id, targetPlayer.id);
        if (success) {
          await this.sendToConnection(connectionId, 'vote-confirmed', {
            targetId,
            message: 'Voto registrado com sucesso',
          });
        } else {
          await this.sendError(connectionId, 'VOTE_FAILED', 'Failed to cast vote. Target may be invalid or already voted.');
        }
      } else {
        wsLogger.warn('castVote method not available on gameStateService');
        await this.sendError(connectionId, 'VOTE_FAILED', 'Voting system is currently unavailable.');
      }

    } catch (error) {
      wsLogger.error('Error casting vote', error instanceof Error ? error : new Error('Unknown vote error'), { connectionId, targetId });
      await this.sendError(connectionId, 'VOTE_FAILED', 'Internal error casting vote');
    }
  }

  private async handleUnvote(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to unvote');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const game = await this.getActiveGameForRoom(roomId);

      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      if (game.phase !== 'VOTING') {
        await this.sendError(connectionId, 'INVALID_PHASE', 'Unvoting is only allowed during voting phase');
        return;
      }

      const voterPlayer = game.players.find(p => p.userId === connection.context.userId);
      if (!voterPlayer) {
        await this.sendError(connectionId, 'PLAYER_NOT_FOUND', 'Voter not found in game state.');
        return;
      }

      // CORREÇÃO 4: Adicionar verificação antes de chamar o método opcional.
      if (this.gameStateService.removeVote) {
        const success = await this.gameStateService.removeVote(game.gameId, voterPlayer.id);
        if (success) {
          await this.sendToConnection(connectionId, 'unvote-confirmed', {
            message: 'Voto removido com sucesso',
          });
        } else {
          await this.sendError(connectionId, 'UNVOTE_FAILED', 'Failed to remove vote or no vote to remove');
        }
      } else {
        wsLogger.warn('removeVote method not available on gameStateService');
        await this.sendError(connectionId, 'UNVOTE_FAILED', 'Unvoting system is currently unavailable.');
      }
    } catch (error) {
      wsLogger.error('Error removing vote', error instanceof Error ? error : new Error('Unknown unvote error'), { connectionId });
      await this.sendError(connectionId, 'UNVOTE_FAILED', 'Internal error removing vote');
    }
  }

  //====================================================================
  // GAME ACTION HANDLERS
  //====================================================================
  private async handleGameAction(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to perform game actions');
      return;
    }

    const { actionType, targetId, actionData } = data;
    if (!actionType || typeof actionType !== 'string') {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Action type is required');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const game = await this.getActiveGameForRoom(roomId);
      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Active game not found for this action.');
        return;
      }

      const player = game.players.find(p => p.userId === connection.context.userId);
      if (!player) {
        await this.sendError(connectionId, 'PLAYER_NOT_FOUND', 'Player not found in game state.');
        return;
      }

      await this.gameStateService.performPlayerAction(game.gameId, player.id, { type: actionType, targetId, data: actionData });

      wsLogger.info('Game action processed', {
        userId: connection.context.userId,
        gameId: game.gameId,
        actionType,
        targetId,
      });

    } catch (error) {
      wsLogger.error('Error processing game action', error instanceof Error ? error : new Error('Unknown game action error'), { connectionId, actionType });
      await this.sendError(connectionId, 'ACTION_FAILED', 'Failed to process game action');
    }
  }

  private async handleNightAction(connectionId: string, data: any): Promise<void> {
    await this.handleGameAction(connectionId, data);
  }

  //====================================================================
  // ADDITIONAL & A10 HANDLERS
  //====================================================================
  private async handleKickPlayer(connectionId: string, data: any): Promise<void> {
    await this.sendError(connectionId, 'NOT_IMPLEMENTED', 'Kick player not yet implemented');
  }

  private async handleChatMessage(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { message, channel = 'public' } = data;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Message cannot be empty');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      if (!roomId) {
        await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to send chat messages');
        return;
      }

      const chatMessage = {
        id: Date.now().toString(),
        userId: connection.context.userId,
        username: connection.context.username,
        message: message.trim(),
        channel,
        timestamp: new Date().toISOString(),
      };

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'chat-message', { message: chatMessage });
      }

    } catch (error) {
      wsLogger.error('Error sending chat message', error instanceof Error ? error : new Error('Unknown chat error'), {
        connectionId,
        message: message.substring(0, 50),
      });
      await this.sendError(connectionId, 'CHAT_FAILED', 'Failed to send chat message');
    }
  }

  private async handleSpectateRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { roomId } = data;
    if (!roomId || typeof roomId !== 'string') {
      await this.sendError(connectionId, 'MISSING_ROOM_ID', 'Room ID is required');
      return;
    }

    try {
      const roomQuery = `
          SELECT r.*, u.username as "hostUsername"
          FROM rooms r
          JOIN users u ON r."hostId" = u.id
          WHERE r.id = $1 AND r.status != 'FINISHED'
        `;
      const roomResult = await pool.query(roomQuery, [roomId]);

      if (roomResult.rows.length === 0) {
        await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room not found or finished');
        return;
      }
      const roomData = roomResult.rows[0];

      if (connection.context.roomId) {
        await this.sendError(connectionId, 'ALREADY_IN_ROOM' as any, 'Must leave current room first');
        return;
      }

      const spectatorCount = this.channelManager.getRoomStats(roomId).spectatorCount;
      if (spectatorCount >= roomData.maxSpectators) {
        await this.sendError(connectionId, 'ROOM_FULL', 'Maximum spectators reached');
        return;
      }

      this.channelManager.joinChannel(connectionId, roomId, true);

      connection.context.roomId = roomId;
      connection.isSpectator = true;

      await this.sendToConnection(connectionId, 'spectate-success', {
        roomId,
        roomName: roomData.name,
        spectatorCount: spectatorCount + 1,
        maxSpectators: roomData.maxSpectators
      });

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'spectator-joined', {
          userId: connection.context.userId,
          username: connection.context.username,
          spectatorCount: spectatorCount + 1
        }, connectionId);
      }

      await this.eventBus.publish('room:spectator-joined', {
        roomId,
        userId: connection.context.userId,
        username: connection.context.username,
      });

      wsLogger.info('User joined as spectator', {
        userId: connection.context.userId,
        roomId,
      });

    } catch (error) {
      wsLogger.error('Error joining as spectator', error instanceof Error ? error : new Error('Unknown spectate error'), {
        connectionId,
        roomId
      });
      await this.sendError(connectionId, 'JOIN_ROOM_FAILED', 'Failed to join as spectator');
    }
  }

  private async handleStopSpectating(connectionId: string, data: any): Promise<void> {
    await this.handleLeaveRoom(connectionId, data);
  }

  private async handleForcePhase(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to force phase');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const activeGame = await this.getActiveGameForRoom(roomId);
      if (!activeGame) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'No active game in this room to force phase.');
        return;
      }

      await this.gameStateService.forcePhase(activeGame.gameId);

      await this.sendToConnection(connectionId, 'phase-forced', {
        message: 'Comando para forçar a fase foi processado com sucesso.',
      });

    } catch (error) {
      wsLogger.error('Error forcing phase', error instanceof Error ? error : new Error('Unknown force phase error'), { connectionId });
      await this.sendError(connectionId, 'FORCE_PHASE_FAILED', 'Failed to force phase');
    }
  }

  private async handleGetGameState(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to get game state');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const gameState = await this.getActiveGameForRoom(roomId);

      if (!gameState) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      await this.sendToConnection(connectionId, 'game-state', {
        gameState: {
          gameId: gameState.gameId,
          status: gameState.status,
          phase: gameState.phase,
          day: gameState.day,
          timeLeft: gameState.timeLeft,
          players: gameState.players.map(p => ({
            id: p.id,
            username: p.username,
            isAlive: p.isAlive,
            hasVoted: p.hasVoted,
            role: p.userId === connection.context.userId ? p.role : undefined,
          })),
        },
      });
    } catch (error) {
      wsLogger.error('Error getting game state', error instanceof Error ? error : new Error('Unknown get state error'), {
        connectionId,
      });
      await this.sendError(connectionId, 'GET_STATE_FAILED', 'Failed to get game state');
    }
  }

  //====================================================================
  // A10 HANDLERS (Implementações abaixo)
  //====================================================================

  private async handleReconnect(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      await this.sendError(connectionId, 'INVALID_CONNECTION' as any, 'Connection not found');
      return;
    }

    try {
      const { expectedRoomId, lastGameId } = data;
      wsLogger.info('Reconnection attempt', { userId: connection.context.userId, expectedRoomId });

      if (expectedRoomId) {
        // CORREÇÃO: Permitir reconexão para salas em 'WAITING' ou 'PLAYING'.
        const roomQuery = `
          SELECT r.* FROM rooms r 
          WHERE r.id = $1 AND r.status != 'FINISHED'
        `;
        const roomResult = await pool.query(roomQuery, [expectedRoomId]);

        if (roomResult.rows.length === 0) {
          await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room no longer exists or is not available for reconnection');
          return;
        }
        const roomData = roomResult.rows[0];

        // ... o resto da função permanece igual ...
        const storedState = this.connectionManager.getStoredState(connection.context.userId);
        const isSpectator = storedState?.isSpectator || false;

        this.channelManager.joinChannel(connectionId, expectedRoomId, isSpectator);

        connection.context.roomId = expectedRoomId;
        connection.isSpectator = isSpectator;

        await this.sendToConnection(connectionId, 'reconnection-success', {
          roomId: expectedRoomId,
          roomName: roomData.name,
          isSpectator: isSpectator,
          gameState: storedState?.gameState || null,
          message: 'Reconnected successfully'
        });

        if (this.broadcastToRoom) {
          this.broadcastToRoom(expectedRoomId, 'player-reconnected', {
            userId: connection.context.userId,
            username: connection.context.username,
            isSpectator: isSpectator,
          }, connectionId);
        }
      } else {
        await this.sendToConnection(connectionId, 'reconnection-success', {
          message: 'Connection restored'
        });
      }
    } catch (error) {
      wsLogger.error('Error handling reconnection', error instanceof Error ? error : new Error('Unknown reconnect error'), { connectionId });
      await this.sendError(connectionId, 'RECONNECT_FAILED' as any, 'Failed to process reconnection');
    }
  }

  private async handleActivityPing(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    if (data?.expectResponse) {
      await this.sendToConnection(connectionId, 'activity-pong', {
        timestamp: new Date().toISOString(),
      });
    }
    wsLogger.debug('Activity ping processed', { userId: connection.context.userId });
  }

  private async handleSpectatorChat(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.isSpectator || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_SPECTATING' as any, 'Must be spectating to use spectator chat');
      return;
    }

    try {
      const { message } = data;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        await this.sendError(connectionId, 'INVALID_MESSAGE', 'Message cannot be empty');
        return;
      }

      const chatMessage = {
        userId: connection.context.userId,
        username: connection.context.username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      this.channelManager.broadcastToSpectators(connection.context.roomId, 'spectator-chat', { message: chatMessage });

    } catch (error) {
      wsLogger.error('Error handling spectator chat', error instanceof Error ? error : new Error('Unknown chat error'), { connectionId });
      await this.sendError(connectionId, 'CHAT_FAILED', 'Failed to send chat message');
    }
  }

  private async handleGetRoomState(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      const roomQuery = `SELECT r.*, u.username as "hostUsername" FROM rooms r JOIN users u ON r."hostId" = u.id WHERE r.id = $1`;
      const roomResult = await pool.query(roomQuery, [roomId]);

      if (roomResult.rows.length === 0) {
        await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }
      const roomData = roomResult.rows[0];

      const playerConnections = this.channelManager.getRoomPlayerConnections(roomId);
      const spectatorConnections = this.channelManager.getRoomSpectatorConnections(roomId);

      const players = Array.from(playerConnections).map(connId => this.connectionManager.getConnection(connId))
        .filter((conn): conn is NonNullable<typeof conn> => conn !== undefined)
        .map(conn => ({
          userId: conn.context.userId,
          username: conn.context.username,
        }));

      const spectators = Array.from(spectatorConnections).map(connId => this.connectionManager.getConnection(connId))
        .filter((conn): conn is NonNullable<typeof conn> => conn !== undefined)
        .map(conn => ({
          userId: conn.context.userId,
          username: conn.context.username,
        }));

      const roomState = {
        roomId,
        roomName: roomData.name,
        hostUsername: roomData.hostUsername,
        status: roomData.status,
        players,
        spectators,
        playerCount: players.length,
        spectatorCount: spectators.length,
      };

      await this.sendToConnection(connectionId, 'room-state', roomState);
    } catch (error) {
      wsLogger.error('Error getting room state', error instanceof Error ? error : new Error('Unknown room state error'), { connectionId });
      await this.sendError(connectionId, 'GET_STATE_FAILED', 'Failed to get room state');
    }
  }

  //====================================================================
  // UTILITY METHODS
  //====================================================================
  private async sendToConnection(connectionId: string, type: string, data?: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || connection.ws.readyState !== connection.ws.OPEN) {
      return;
    }

    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      wsLogger.error('Failed to send message to connection', error instanceof Error ? error : new Error('Unknown send error'), {
        connectionId,
        type,
      });
    }
  }

  private async sendError(connectionId: string, code: WebSocketErrorCode, message: string): Promise<void> {
    await this.sendToConnection(connectionId, 'error', {
      code: code as any,
      message,
    });
  }

  //====================================================================
  // HANDLER REGISTRATION (for extensibility)
  //====================================================================
  registerHandler(type: string, handler: MessageHandler): void {
    if (this.handlers.has(type)) {
      wsLogger.warn('Overriding existing message handler', { type });
    }
    this.handlers.set(type, handler);
  }

  unregisterHandler(type: string): boolean {
    return this.handlers.delete(type);
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}