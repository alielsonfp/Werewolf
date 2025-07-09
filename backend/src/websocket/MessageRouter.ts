// 🐺 LOBISOMEM ONLINE - Message Router (FASE 1 - CORREÇÃO CRÍTICA)
import { wsLogger } from '@/utils/logger';
import { validateWebSocketMessage } from '@/config/websocket';
import { pool } from '@/config/database';
import type { ConnectionManager } from './ConnectionManager';
import type { ChannelManager } from './ChannelManager';
import type { GameEngine } from '@/game/GameEngine';
import type { IEventBus, WebSocketErrorCode } from '@/types';
import { Player } from '@/game/Game';

//====================================================================
// MESSAGE HANDLER TYPE
//====================================================================
type MessageHandler = (connectionId: string, data: any) => Promise<void>;

//====================================================================
// MESSAGE ROUTER CLASS - FASE 1
//====================================================================
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();
  private broadcastToRoom?: (roomId: string, type: string, data?: any, excludeConnectionId?: string) => number;
  private sendToUser?: (userId: string, type: string, data?: any) => boolean;

  constructor(
    private connectionManager: ConnectionManager,
    private channelManager: ChannelManager,
    private gameEngine: GameEngine,
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

    // Room admin
    this.handlers.set('delete-room', this.handleDeleteRoom.bind(this));
    this.handlers.set('kick-player', this.handleKickPlayer.bind(this));
    this.handlers.set('chat-message', this.handleChatMessage.bind(this));
    this.handlers.set('spectate-room', this.handleSpectateRoom.bind(this));
    this.handlers.set('stop-spectating', this.handleStopSpectating.bind(this));

    // Game handlers
    this.handlers.set('get-game-state', this.handleGetGameState.bind(this));
    this.handlers.set('game-action', this.handleGameAction.bind(this));
    this.handlers.set('vote', this.handleVote.bind(this));
    this.handlers.set('unvote', this.handleUnvote.bind(this));

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
            isReady: this.channelManager.isPlayerReady(roomId, connId),
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

      // ✅ CORREÇÃO CRÍTICA: Criar objeto para o jogador que está entrando
      const playerForSelf = {
        id: `${roomId}-${connection.context.userId}`,
        userId: connection.context.userId,
        username: connection.context.username,
        avatar: null,
        isHost: roomData.hostId === connection.context.userId,
        isReady: this.channelManager.isPlayerReady(roomId, connectionId),
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
        player: playerForSelf,
        yourRole: asSpectator ? 'SPECTATOR' : (playerForSelf.isHost ? 'HOST' : 'PLAYER'),
      });

      // Broadcast player-joined to other room members
      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'player-joined', { player: playerForSelf }, connectionId);
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
        isHost: playerForSelf.isHost,
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

      this.channelManager.setPlayerReadyStatus(roomId, connectionId, ready);

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

  // ✅ FASE 1 - CORREÇÃO CRÍTICA: handleStartGame com gameId padronizado
  private async handleStartGame(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to start game');
      return;
    }

    const roomId = connection.context.roomId;
    // ✅ FASE 1 - CORREÇÃO CRÍTICA: gameId padronizado e consistente
    const gameId = `game-${roomId}`;

    try {
      // ✅ FASE 1 - LOG MELHORADO: Estado inicial do processo
      wsLogger.info('Starting game process - Phase 1', {
        connectionId,
        roomId,
        gameId,
        hostId: connection.context.userId,
        pattern: 'game-${roomId}'
      });

      // Verificar se é o host
      const roomQuery = await pool.query(`SELECT * FROM rooms WHERE id = $1`, [roomId]);
      if (roomQuery.rows.length === 0) {
        await this.sendError(connectionId, 'ROOM_NOT_FOUND', 'Room not found');
        return;
      }

      const roomData = roomQuery.rows[0];
      if (roomData.hostId !== connection.context.userId) {
        await this.sendError(connectionId, 'NOT_HOST', 'Only the host can start the game');
        return;
      }

      // ✅ FASE 1 - IMPORTANTE: Verificar se jogo já existe com o gameId CORRETO
      let gameState = await this.gameEngine.getGameState(gameId);

      if (!gameState) {
        wsLogger.info('Game does not exist, creating new game with standardized ID', {
          gameId,
          roomId,
          pattern: 'game-${roomId}'
        });

        const gameConfig = {
          roomId: roomId,
          maxPlayers: roomData.maxPlayers,
          maxSpectators: roomData.maxSpectators,
          nightDuration: 60000,
          dayDuration: 120000,
          votingDuration: 60000,
          allowReconnection: true,
          reconnectionTimeout: 120000,
        };

        // ✅ FASE 1 - AGORA o GameEngine criará o jogo com gameId = `game-${roomId}`
        gameState = await this.gameEngine.createGame(connection.context.userId, gameConfig);

        wsLogger.info('Game created successfully with standardized ID', {
          gameId: gameState.gameId,
          roomId,
          hostId: connection.context.userId,
          expectedGameId: gameId,
          actualGameId: gameState.gameId,
          idsMatch: gameState.gameId === gameId
        });
      } else {
        wsLogger.info('Game already exists, using existing game', {
          gameId,
          status: gameState.status,
          playerCount: gameState.players.length
        });
      }

      // ✅ FASE 1 - LOG MELHORADO: Players being added
      const roomConnections = this.channelManager.getRoomPlayerConnections(roomId);
      wsLogger.info('Adding players to game', {
        gameId,
        roomConnectionCount: roomConnections.size,
        existingPlayerCount: gameState.players.length
      });

      // ✅ FASE 1 - Adicionar jogadores usando o gameId CORRETO
      for (const connId of roomConnections) {
        const conn = this.connectionManager.getConnection(connId);
        if (conn && !conn.context.isSpectator) {
          const player = new Player({
            id: `${roomId}-${conn.context.userId}`,
            userId: conn.context.userId,
            username: conn.context.username,
            avatar: undefined,
            isHost: roomData.hostId === conn.context.userId,
            isReady: this.channelManager.isPlayerReady(roomId, connId),
            isSpectator: false,
            isConnected: true,
            joinedAt: new Date(),
            lastSeen: new Date(),
          });

          // ✅ FASE 1 - USAR o gameId CORRETO para adicionar o jogador
          const addResult = await this.gameEngine.addPlayer(gameId, player);

          wsLogger.debug('Player added to game', {
            gameId,
            playerId: player.id,
            userId: player.userId,
            username: player.username,
            isHost: player.isHost,
            isReady: player.isReady,
            addResult
          });
        }
      }

      // ✅ FASE 1 - LOG ANTES DE TENTAR INICIAR: Verificar estado final
      const finalGameState = await this.gameEngine.getGameState(gameId);
      if (finalGameState) {
        const alivePlayers = finalGameState.getAlivePlayers();
        const hostPlayer = alivePlayers.find(p => p.isHost);
        const nonHostPlayers = alivePlayers.filter(p => !p.isHost);
        const readyNonHostPlayers = nonHostPlayers.filter(p => p.isReady);

        wsLogger.info('Attempting to start game - Final validation', {
          gameId,
          canStart: finalGameState.canStart(),
          totalPlayers: alivePlayers.length,
          hostFound: !!hostPlayer,
          hostUsername: hostPlayer?.username,
          hostReady: hostPlayer?.isReady,
          nonHostPlayers: nonHostPlayers.length,
          readyNonHostPlayers: readyNonHostPlayers.length,
          playersNotReady: nonHostPlayers.filter(p => !p.isReady).map(p => p.username),
          gameStatus: finalGameState.status
        });
      }

      // ✅ FASE 1 - Iniciar o jogo com o gameId CORRETO
      const success = await this.gameEngine.startGame(gameId);

      if (!success) {
        // ✅ FASE 1 - LOG DETALHADO do erro
        const currentState = await this.gameEngine.getGameState(gameId);
        let errorDetails = 'Unknown error';

        if (currentState) {
          const alivePlayers = currentState.getAlivePlayers();
          const hostPlayer = alivePlayers.find(p => p.isHost);
          const nonHostPlayers = alivePlayers.filter(p => !p.isHost);
          const notReadyPlayers = nonHostPlayers.filter(p => !p.isReady);

          errorDetails = `Status: ${currentState.status}, Players: ${alivePlayers.length}, Host: ${hostPlayer ? 'Found' : 'Missing'}, Not Ready: ${notReadyPlayers.map(p => p.username).join(', ')}`;
        }

        wsLogger.error('Failed to start game - Phase 1', {
          gameId,
          roomId,
          errorDetails
        });

        await this.sendError(connectionId, 'START_GAME_FAILED',
          `Failed to start game. ${errorDetails}`
        );
        return;
      }

      wsLogger.info('Game started successfully - Phase 1 implementation', {
        gameId,
        roomId,
        hostId: connection.context.userId,
      });

    } catch (error) {
      wsLogger.error('Error starting game - Phase 1', error instanceof Error ? error : new Error('Unknown start game error'), {
        connectionId,
        gameId,
        roomId,
      });

      await this.sendError(connectionId, 'START_GAME_FAILED', 'Internal error starting game');
    }
  }

  //====================================================================
  // GAME HANDLERS
  //====================================================================
  private async handleGetGameState(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { gameId } = data;
    if (!gameId) {
      await this.sendError(connectionId, 'MISSING_GAME_ID', 'Game ID is required');
      return;
    }

    try {
      const gameState = await this.gameEngine.getGameState(gameId);

      if (!gameState) {
        await this.sendError(connectionId, 'GAME_NOT_FOUND', 'Game not found');
        return;
      }

      const personalizedState = this.getPersonalizedGameState(gameState, connection.context.userId);

      await this.sendToConnection(connectionId, 'game-state', personalizedState);

      wsLogger.info('Game state sent to player', {
        connectionId,
        userId: connection.context.userId,
        gameId,
      });

    } catch (error) {
      wsLogger.error('Error getting game state', error instanceof Error ? error : new Error('Unknown error'), {
        connectionId,
        gameId,
      });

      await this.sendError(connectionId, 'GET_GAME_STATE_FAILED', 'Failed to get game state');
    }
  }

  private async handleGameAction(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to perform game actions');
      return;
    }

    const { type, targetId } = data;
    const gameId = `game-${connection.context.roomId}`;

    try {
      const success = await this.gameEngine.performPlayerAction(
        gameId,
        connection.context.userId,
        { type, targetId }
      );

      if (success) {
        await this.sendToConnection(connectionId, 'action-confirmed', {
          actionType: type,
          message: 'Ação registrada com sucesso'
        });
      } else {
        await this.sendError(connectionId, 'ACTION_FAILED', 'Falha ao executar ação');
      }

    } catch (error) {
      wsLogger.error('Error performing game action', error instanceof Error ? error : new Error('Unknown action error'), {
        connectionId,
        action: type,
        targetId,
      });
      await this.sendError(connectionId, 'ACTION_FAILED', 'Erro interno ao executar ação');
    }
  }

  private async handleVote(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to vote');
      return;
    }

    const { targetId } = data;
    const gameId = `game-${connection.context.roomId}`;

    try {
      const success = await this.gameEngine.castVote(
        gameId,
        connection.context.userId,
        targetId
      );

      if (success) {
        await this.sendToConnection(connectionId, 'vote-confirmed', {
          message: 'Voto registrado'
        });
      } else {
        await this.sendError(connectionId, 'VOTE_FAILED', 'Falha ao registrar voto');
      }

    } catch (error) {
      wsLogger.error('Error casting vote', error instanceof Error ? error : new Error('Unknown vote error'), {
        connectionId,
        targetId,
      });
      await this.sendError(connectionId, 'VOTE_FAILED', 'Erro interno ao votar');
    }
  }

  private async handleUnvote(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.context.roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Must be in a room to unvote');
      return;
    }

    const gameId = `game-${connection.context.roomId}`;

    try {
      const success = await this.gameEngine.removeVote(
        gameId,
        connection.context.userId
      );

      if (success) {
        await this.sendToConnection(connectionId, 'unvote-confirmed', {
          message: 'Voto removido'
        });
      } else {
        await this.sendError(connectionId, 'UNVOTE_FAILED', 'Falha ao remover voto');
      }

    } catch (error) {
      wsLogger.error('Error removing vote', error instanceof Error ? error : new Error('Unknown unvote error'), {
        connectionId,
      });
      await this.sendError(connectionId, 'UNVOTE_FAILED', 'Erro interno ao remover voto');
    }
  }

  //====================================================================
  // PERSONALIZED GAME STATE
  //====================================================================
  private getPersonalizedGameState(gameState: any, userId: string): any {
    const currentPlayer = gameState.players.find((p: any) => p.userId === userId);
    const personalizedState = JSON.parse(JSON.stringify(gameState));

    personalizedState.players = personalizedState.players.map((player: any) => {
      if (player.userId === userId) {
        return player;
      } else if (!player.isAlive) {
        return player;
      } else {
        const { role, faction, ...publicData } = player;
        return publicData;
      }
    });

    if (currentPlayer) {
      personalizedState.me = {
        id: currentPlayer.id,
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        role: currentPlayer.role,
        faction: currentPlayer.faction,
        isAlive: currentPlayer.isAlive,
        isProtected: currentPlayer.isProtected,
        hasActed: currentPlayer.hasActed,
        hasVoted: currentPlayer.hasVoted,
        votedFor: currentPlayer.votedFor,
        actionsUsed: currentPlayer.actionsUsed,
        maxActions: currentPlayer.maxActions,
      };
    }

    return personalizedState;
  }

  //====================================================================
  // ADDITIONAL HANDLERS
  //====================================================================
  private async handleDeleteRoom(connectionId: string, data: any): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const roomId: string | undefined = data?.roomId || connection.context.roomId;
    if (!roomId) {
      await this.sendError(connectionId, 'NOT_IN_ROOM', 'Not currently in a room');
      return;
    }

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

      const allRoomConnections = this.channelManager.getRoomConnections(roomId);

      if (this.broadcastToRoom) {
        this.broadcastToRoom(roomId, 'room-deleted', {
          roomId,
          reason: 'Host ended the room',
          timestamp: new Date().toISOString(),
        });
      }

      for (const connId of allRoomConnections) {
        this.channelManager.leaveRoom(roomId, connId);
        this.connectionManager.updateConnectionContext(connId, {
          roomId: undefined,
          isSpectator: false,
        });
      }

      await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);

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