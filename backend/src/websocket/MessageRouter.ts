// 🐺 LOBISOMEM ONLINE - Message Router (CORRIGIDO FINAL)
import { Player } from '@/game/Game';
import { wsLogger } from '@/utils/logger';
import { validateWebSocketMessage } from '@/config/websocket';
import { pool } from '@/config/database';
import type { ConnectionManager } from './ConnectionManager';
import type { ChannelManager } from './ChannelManager';
import type { IGameStateService, IEventBus, WebSocketErrorCode, GameState } from '@/types';

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

    // Room management (Required events)
    this.handlers.set('join-room', this.handleJoinRoom.bind(this));
    this.handlers.set('leave-room', this.handleLeaveRoom.bind(this));
    this.handlers.set('player-ready', this.handlePlayerReady.bind(this));
    this.handlers.set('start-game', this.handleStartGame.bind(this));

    this.handlers.set('delete-room', this.handleDeleteRoom.bind(this));

    // Sistema de votação (vote, unvote)
    this.handlers.set('vote', this.handleVote.bind(this));
    this.handlers.set('unvote', this.handleUnvote.bind(this));

    // Game actions
    this.handlers.set('game-action', this.handleGameAction.bind(this));
    this.handlers.set('night-action', this.handleNightAction.bind(this));

    // Additional handlers
    this.handlers.set('kick-player', this.handleKickPlayer.bind(this));
    this.handlers.set('chat-message', this.handleChatMessage.bind(this));
    this.handlers.set('spectate-room', this.handleSpectateRoom.bind(this));
    this.handlers.set('stop-spectating', this.handleStopSpectating.bind(this));

    // Administrative handlers
    this.handlers.set('force-phase', this.handleForcePhase.bind(this));
    this.handlers.set('get-game-state', this.handleGetGameState.bind(this));

    wsLogger.debug('Message handlers setup completed', {
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
      // Validate message format
      const validation = validateWebSocketMessage(message);
      if (!validation.isValid) {
        await this.sendError(connectionId, 'INVALID_MESSAGE', validation.error || 'Invalid message format');
        return;
      }

      const validMessage = validation.message!;

      wsLogger.debug('Message received', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        type: validMessage.type,
        roomId: connection.context.roomId,
      });

      // Get and execute handler
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
    this.connectionManager.markAlive(connectionId);
  }

  private async handleHeartbeat(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    this.connectionManager.markAlive(connectionId);

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
  // ROOM HANDLERS COM DADOS REAIS DO BANCO
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
      // Buscar dados reais da sala no banco de dados
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

      // Verificar se a sala está disponível
      if (roomData.status !== 'WAITING') {
        await this.sendError(connectionId, 'ROOM_NOT_JOINABLE', 'Room is not accepting new players');
        return;
      }

      // Join the room channel
      const success = this.channelManager.joinRoom(roomId, connectionId, asSpectator);
      if (!success) {
        await this.sendError(connectionId, 'JOIN_ROOM_FAILED', 'Failed to join room');
        return;
      }

      // Update connection context
      this.connectionManager.updateConnectionContext(connectionId, {
        roomId,
        isSpectator: asSpectator,
      });

      // Get room connections for player list
      const roomConnections = this.channelManager.getRoomPlayerConnections(roomId);
      const spectatorConnections = this.channelManager.getRoomSpectatorConnections(roomId);

      const players: any[] = [];
      const spectators: any[] = [];

      // Build player list com dados reais
      for (const connId of roomConnections) {
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
            joinedAt: new Date().toISOString(),
          });
        }
      }

      // Build spectator list
      for (const connId of spectatorConnections) {
        const conn = this.connectionManager.getConnection(connId);
        if (conn) {
          spectators.push({
            id: `${roomId}-${conn.context.userId}`,
            userId: conn.context.userId,
            username: conn.context.username,
            avatar: null,
            isSpectator: true,
            isConnected: true,
            joinedAt: new Date().toISOString(),
          });
        }
      }

      // Create player object for this connection
      const player = {
        id: `${roomId}-${connection.context.userId}`,
        userId: connection.context.userId,
        username: connection.context.username,
        avatar: null,
        isHost: roomData.hostId === connection.context.userId,
        isReady: false,
        isSpectator: asSpectator,
        isConnected: true,
        joinedAt: new Date().toISOString(),
      };

      // Send room-joined event com dados reais do banco
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
          serverId: roomData.serverId,
          createdAt: roomData.createdAt,
          updatedAt: roomData.updatedAt,
        },
        players,
        spectators,
        player,
        yourRole: asSpectator ? 'SPECTATOR' : (player.isHost ? 'HOST' : 'PLAYER'),
      });

      // Broadcast player-joined to other room members
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-joined', { player }, connectionId);
      }

      // Publish event to event bus
      await this.eventBus.publish('room:player-joined', {
        roomId,
        userId: connection.context.userId,
        username: connection.context.username,
        asSpectator,
        timestamp: new Date().toISOString(),
      });

      wsLogger.info('Player joined room with real data', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        roomId,
        roomName: roomData.name,
        hostId: roomData.hostId,
        isHost: player.isHost,
        asSpectator,
      });

    } catch (error) {
      wsLogger.error('Error joining room', error instanceof Error ? error : new Error('Unknown join room error'), {
        connectionId,
        roomId,
        asSpectator,
      });

      await this.sendError(connectionId, 'JOIN_ROOM_FAILED', 'Internal error joining room');
    }
  }

  private async handleLeaveRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const roomId: string | undefined = data?.roomId || connection.context.roomId;
    if (!roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Not currently in a room');
      return;
    }

    try {
      // Leave the room channel
      const success = this.channelManager.leaveRoom(roomId, connectionId);
      if (!success) {
        await this.sendError(connectionId, 'LEAVE_ROOM_FAILED', 'Failed to leave room');
        return;
      }

      // Update connection context
      this.connectionManager.updateConnectionContext(connectionId, {
        roomId: undefined,
        isSpectator: false,
      });

      // Send room-left confirmation
      await this.sendToConnection(connectionId, 'room-left', { roomId });

      // Broadcast player-left to remaining room members
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-left', {
          userId: connection.context.userId,
          username: connection.context.username,
        }, connectionId);
      }

      // Publish event to event bus
      await this.eventBus.publish('room:player-left', {
        roomId,
        userId: connection.context.userId,
        username: connection.context.username,
        timestamp: new Date().toISOString(),
      });

      wsLogger.info('Player left room', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        roomId,
      });

    } catch (error) {
      wsLogger.error('Error leaving room', error instanceof Error ? error : new Error('Unknown leave room error'), {
        connectionId,
        roomId,
      });

      await this.sendError(connectionId, 'LEAVE_ROOM_FAILED', 'Internal error leaving room');
    }
  }

  // Handler para deletar sala (apenas host)
  private async handleDeleteRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const roomId: string | undefined = data?.roomId || connection.context.roomId;
    if (!roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Not currently in a room');
      return;
    }

    try {
      // Verificar se o usuário é o host da sala no banco de dados
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

      // Obter todas as conexões da sala antes de deletar
      const allRoomConnections = this.channelManager.getRoomConnections(roomId);

      // Broadcast para todos na sala que ela foi deletada
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'room-deleted', {
          roomId,
          reason: 'Host ended the room',
          timestamp: new Date().toISOString(),
        });
      }

      // Remover todos os usuários da sala
      for (const connId of allRoomConnections) {
        this.channelManager.leaveRoom(roomId, connId);

        // Atualizar contexto da conexão
        this.connectionManager.updateConnectionContext(connId, {
          roomId: undefined,
          isSpectator: false,
        });
      }

      // Deletar a sala do banco de dados
      await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);

      // Publish event to event bus
      await this.eventBus.publish('room:deleted', {
        roomId,
        hostId: connection.context.userId,
        timestamp: new Date().toISOString(),
      });

      wsLogger.info('Room deleted by host', {
        connectionId,
        hostId: connection.context.userId,
        roomId,
        affectedConnections: allRoomConnections.size,
      });

    } catch (error) {
      wsLogger.error('Error deleting room', error instanceof Error ? error : new Error('Unknown delete room error'), {
        connectionId,
        roomId,
      });

      await this.sendError(connectionId, 'DELETE_ROOM_FAILED', 'Internal error deleting room');
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

      // Broadcast ready status to room
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-ready', {
          userId: connection.context.userId,
          username: connection.context.username,
          ready,
        });
      }

      // Publish event to event bus
      await this.eventBus.publish('room:player-ready', {
        roomId,
        userId: connection.context.userId,
        username: connection.context.username,
        ready,
        timestamp: new Date().toISOString(),
      });

      wsLogger.info('Player ready status changed', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        roomId,
        ready,
      });

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

      // Cria a instância do jogo no serviço
      const newGame = await this.gameStateService.createGame(connection.context.userId, gameConfig);
      if (!newGame) {
        await this.sendError(connectionId, 'START_GAME_FAILED', 'Failed to create game state.');
        return;
      }
      const gameId = newGame.gameId;

      // Passa os dados dos jogadores para o GameEngine
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

      // Inicia o jogo
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
  // Função auxiliar para evitar repetição de código
  private async getActiveGameForRoom(roomId: string): Promise<GameState | null> {
    const gamesInRoom = await this.gameStateService.getGamesByRoom(roomId);
    const activeGame = gamesInRoom.find(g => g.status === 'PLAYING');
    return activeGame || null;
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

      // Encontrar o jogo ativo na sala primeiro
      const game = await this.getActiveGameForRoom(roomId);

      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      if (game.phase !== 'VOTING') {
        await this.sendError(connectionId, 'INVALID_PHASE', 'Voting is only allowed during voting phase');
        return;
      }

      // Agora o 'game' é a instância correta do GameState
      const success = game.addVote(connection.context.userId, targetId);

      if (success) {
        if (this.broadcastToRoom) {
          this.broadcastToRoom(roomId, 'vote-cast', {
            voterId: connection.context.userId,
            voterName: connection.context.username,
            targetId,
            timestamp: new Date().toISOString(),
          });
        }
        await this.sendToConnection(connectionId, 'vote-confirmed', {
          targetId,
          message: 'Voto registrado com sucesso',
        });
        wsLogger.info('Vote cast successfully', {
          connectionId,
          userId: connection.context.userId,
          gameId: game.gameId,
          targetId,
        });
      } else {
        await this.sendError(connectionId, 'VOTE_FAILED', 'Failed to cast vote. Target may be invalid or already voted.');
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

      // Encontrar o jogo ativo na sala
      const game = await this.getActiveGameForRoom(roomId);

      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      if (game.phase !== 'VOTING') {
        await this.sendError(connectionId, 'INVALID_PHASE', 'Unvoting is only allowed during voting phase');
        return;
      }

      const success = game.removeVote(connection.context.userId);

      if (success) {
        if (this.broadcastToRoom) {
          this.broadcastToRoom(roomId, 'vote-removed', {
            voterId: connection.context.userId,
            voterName: connection.context.username,
            timestamp: new Date().toISOString(),
          });
        }
        await this.sendToConnection(connectionId, 'unvote-confirmed', {
          message: 'Voto removido com sucesso',
        });
        wsLogger.info('Vote removed successfully', {
          connectionId,
          userId: connection.context.userId,
          gameId: game.gameId,
        });
      } else {
        await this.sendError(connectionId, 'UNVOTE_FAILED', 'Failed to remove vote or no vote to remove');
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

      // Encontrar o gameId correto
      const game = await this.getActiveGameForRoom(roomId);
      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Active game not found for this action.');
        return;
      }

      // Enviar para o barramento de eventos com o gameId correto
      await this.eventBus.publish('game:action', {
        gameId: game.gameId,
        playerId: connection.context.userId,
        actionType,
        targetId,
        actionData,
        timestamp: new Date().toISOString(),
      });

      wsLogger.info('Game action processed', {
        connectionId,
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
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to perform night actions');
      return;
    }

    const { actionType, targetId } = data;
    if (!actionType || typeof actionType !== 'string') {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Action type is required');
      return;
    }

    try {
      const roomId = connection.context.roomId;

      // Encontrar o jogo ativo na sala
      const game = await this.getActiveGameForRoom(roomId);

      if (!game) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      if (game.phase !== 'NIGHT') {
        await this.sendError(connectionId, 'INVALID_PHASE', 'Night actions only allowed during night phase');
        return;
      }

      await this.eventBus.publish('game:night-action', {
        gameId: game.gameId,
        playerId: connection.context.userId,
        actionType,
        targetId,
        timestamp: new Date().toISOString(),
      });

      await this.sendToConnection(connectionId, 'night-action-confirmed', {
        actionType,
        targetId,
        message: 'Ação noturna registrada',
      });

      wsLogger.info('Night action processed', {
        connectionId,
        userId: connection.context.userId,
        gameId: game.gameId,
        actionType,
        targetId,
      });

    } catch (error) {
      wsLogger.error('Error processing night action', error instanceof Error ? error : new Error('Unknown night action error'), { connectionId, actionType });
      await this.sendError(connectionId, 'ACTION_FAILED', 'Failed to process night action');
    }
  }

  //====================================================================
  // ADDITIONAL HANDLERS
  //====================================================================
  private async handleKickPlayer(connectionId: string, data: any): Promise<void> {
    await this.sendError(connectionId, 'NOT_IMPLEMENTED', 'Kick player not yet implemented');
  }

  private async handleChatMessage(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { message, channel = 'public' } = data;

    if (!message || typeof message !== 'string') {
      await this.sendError(connectionId, 'INVALID_MESSAGE', 'Message is required and must be a string');
      return;
    }

    try {
      const roomId = connection.context.roomId;
      if (!roomId) {
        await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to send chat messages');
        return;
      }

      // Criar objeto de mensagem de chat completo
      const chatMessage = {
        id: Date.now().toString(),
        userId: connection.context.userId,
        username: connection.context.username,
        message: message.trim(),
        channel,
        timestamp: new Date().toISOString(),
      };

      // Broadcast para toda a sala
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'chat-message', { message: chatMessage });
      }

      wsLogger.info('Chat message sent', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        roomId,
        messageLength: message.length,
        channel,
      });

    } catch (error) {
      wsLogger.error('Error sending chat message', error instanceof Error ? error : new Error('Unknown chat error'), {
        connectionId,
        message: message.substring(0, 50),
      });

      await this.sendError(connectionId, 'CHAT_FAILED', 'Failed to send chat message');
    }
  }

  private async handleSpectateRoom(connectionId: string, data: any): Promise<void> {
    await this.handleJoinRoom(connectionId, { ...data, asSpectator: true });
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

      // Encontrar o jogo ativo na sala para obter o GAME_ID correto
      const gamesInRoom = await this.gameStateService.getGamesByRoom(roomId);
      const activeGame = gamesInRoom.find(g => g.status === 'PLAYING');

      if (!activeGame) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'No active game in this room to force phase.');
        return;
      }

      const gameId = activeGame.gameId;

      // Chamar o método 'forcePhase' DIRETAMENTE no serviço, usando o GAME_ID
      await this.gameStateService.forcePhase(gameId);

      // Enviar confirmação para o cliente
      await this.sendToConnection(connectionId, 'phase-forced', {
        message: 'Comando para forçar a fase foi processado com sucesso.',
      });

      wsLogger.info('Phase forced successfully via direct call', {
        connectionId,
        userId: connection.context.userId,
        roomId,
        gameId,
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
      const gameState = await this.gameStateService.getGameState(roomId);

      if (!gameState) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      // Send game state to requesting player
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
            // Don't reveal roles to others
            role: p.id === `${roomId}-${connection.context.userId}` ? p.role : undefined,
          })),
        },
      });

      wsLogger.debug('Game state sent', {
        connectionId,
        userId: connection.context.userId,
        roomId,
      });

    } catch (error) {
      wsLogger.error('Error getting game state', error instanceof Error ? error : new Error('Unknown get state error'), {
        connectionId,
      });

      await this.sendError(connectionId, 'GET_STATE_FAILED', 'Failed to get game state');
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
      code,
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
    wsLogger.debug('Message handler registered', { type });
  }

  unregisterHandler(type: string): boolean {
    const existed = this.handlers.delete(type);
    if (existed) {
      wsLogger.debug('Message handler unregistered', { type });
    }
    return existed;
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}