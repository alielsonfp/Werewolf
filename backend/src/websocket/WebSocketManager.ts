// 🐺 LOBISOMEM ONLINE - WebSocket Manager (VERSÃO FINAL CORRIGIDA)
import http from 'http';
import { WebSocketServer } from 'ws';
import { verifyAccessToken, extractTokenFromWebSocketRequest } from '@/config/jwt';
import { parseWebSocketURL, extractConnectionMetadata } from '@/config/websocket';
import { wsLogger } from '@/utils/logger';
import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { MessageRouter } from './MessageRouter';
import { GameEngine } from '@/game/GameEngine';
import { HeartbeatManager } from './HeartbeatManager';
import type { IEventBus, ConnectionContext } from '@/types';
import type { Config } from '@/config/environment';

export class WebSocketManager {
  public wss: WebSocketServer | null = null;
  private connectionManager: ConnectionManager;

  // ✅ EXPOSIÇÃO PÚBLICA DO CHANNELMANAGER
  public channelManager: ChannelManager;

  private messageRouter: MessageRouter;
  private gameEngine: GameEngine;
  private heartbeatManager: HeartbeatManager;

  public get gameEngine() {
    return this.gameEngine;  // ← Retorna a propriedade privada que já existe
  }

  constructor(
    private eventBus: IEventBus,
    private config: Config
  ) {
    this.connectionManager = new ConnectionManager();
    this.channelManager = new ChannelManager(this.connectionManager);
    this.heartbeatManager = new HeartbeatManager(this.connectionManager);
    this.gameEngine = new GameEngine();

    this.messageRouter = new MessageRouter(
      this.connectionManager,
      this.channelManager,
      this.gameEngine,
      this.eventBus
    );

    this.messageRouter.setBroadcastMethods(
      this.broadcastToRoom.bind(this),
      this.sendToUser.bind(this)
    );
    this.gameEngine.setSendToUserMethod(this.sendToUser.bind(this));

    wsLogger.info('WebSocketManager initialized with GameEngine integration');
  }

  public setupWebSocketServer(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      // ✅ ACEITA QUALQUER CAMINHO QUE COMECE COM /ws
      if (request.url?.startsWith('/ws')) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      } else {
        wsLogger.warn('WebSocket upgrade rejected for invalid path', { path: request.url });
        socket.destroy();
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.heartbeatManager.start();
    wsLogger.info('WebSocket server attached to HTTP upgrade event.');
  }

  private async handleConnection(ws: any, request: any): Promise<void> {
    let connectionId: string | undefined;

    try {
      const urlInfo = parseWebSocketURL(request.url || '');
      const token = extractTokenFromWebSocketRequest(request);

      if (!token) {
        wsLogger.warn('Connection rejected: No authentication token', {
          url: request.url,
          userAgent: request.headers['user-agent'],
        });
        return ws.close(1008, 'Authentication token required');
      }

      const jwtPayload = verifyAccessToken(token);

      // ✅ LÓGICA DE DIFERENCIAÇÃO SALA vs JOGO
      let roomIdFromUrl = urlInfo.roomId;
      let isGameConnection = false;

      if (roomIdFromUrl && roomIdFromUrl.startsWith('game-')) {
        isGameConnection = true;
        // Extrai o roomId real de um gameId, ex: "game-abc" -> "abc"
        roomIdFromUrl = roomIdFromUrl.substring(5);
      }

      const context: ConnectionContext = {
        userId: jwtPayload.userId,
        username: jwtPayload.username,
        serverId: this.config.SERVICE_ID,
        isSpectator: false,
        roomId: roomIdFromUrl, // Armazena o roomId limpo
      };

      const metadata = extractConnectionMetadata(request);
      connectionId = `${context.userId}-${Date.now()}`;

      this.connectionManager.addConnection(connectionId, ws, context, metadata);

      // Setup event handlers
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.messageRouter.handleMessage(connectionId!, message);
        } catch (error) {
          wsLogger.error('Failed to parse message', error as Error, { connectionId });
        }
      });

      ws.on('pong', () => this.heartbeatManager.handlePong(connectionId!));

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleDisconnection(connectionId!, code, reason.toString());
      });

      ws.on('error', (error: Error) => {
        wsLogger.error('WS Connection Error', error, { connectionId });
      });

      // Send connection confirmation
      this.sendToConnection(connectionId, 'connected', {
        userId: context.userId,
        username: context.username,
        serverId: context.serverId,
      });

      // ✅ AQUI ESTÁ A MUDANÇA CRÍTICA DE FLUXO
      if (isGameConnection) {
        // Se é uma conexão de JOGO, apenas peça o estado do jogo.
        // O frontend na página do jogo é quem vai enviar esta mensagem.
        wsLogger.info('Game connection established, waiting for get-game-state', {
          connectionId,
          gameId: urlInfo.roomId,
          roomId: roomIdFromUrl
        });
      } else if (context.roomId) {
        // Se é uma conexão de SALA, acione o `join-room`.
        wsLogger.info('Room connection established. Awaiting join-room request from client.', {
          connectionId,
          roomId: context.roomId,
          userId: context.userId
        });
      }

      wsLogger.info('WebSocket connection established', {
        connectionId,
        userId: context.userId,
        username: context.username,
        roomId: context.roomId,
        isGameConnection,
        originalUrl: urlInfo.roomId,
        userAgent: metadata.userAgent,
        ip: metadata.ip,
      });

    } catch (error) {
      wsLogger.error('Connection failed during handshake', error as Error, {
        url: request.url,
        connectionId,
      });
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleDisconnection(connectionId: string, code: number, reason: string): void {
    const connection = this.connectionManager.getConnection(connectionId);

    if (connection) {
      wsLogger.info('WebSocket connection closed', {
        connectionId,
        userId: connection.context.userId,
        username: connection.context.username,
        roomId: connection.context.roomId,
        code,
        reason,
      });

      // Leave room if connected
      if (connection.context.roomId) {
        this.channelManager.leaveRoom(connection.context.roomId, connectionId);
      }

      // ✅ VERIFICAÇÃO DE SEGURANÇA ANTES DE USAR O EVENTBUS
      if (this.eventBus && typeof this.eventBus.publish === 'function') {
        this.eventBus.publish('connection:disconnected', {
          connectionId,
          userId: connection.context.userId,
          username: connection.context.username,
          roomId: connection.context.roomId,
          code,
          reason,
          timestamp: new Date().toISOString(),
        });
      } else {
        wsLogger.warn('EventBus not available for disconnection event', { connectionId });
      }
    }

    this.connectionManager.removeConnection(connectionId);
  }

  public sendToConnection = (connectionId: string, type: string, data?: any): boolean => {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || connection.ws.readyState !== connection.ws.OPEN) {
      return false;
    }

    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      connection.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      wsLogger.error('Failed to send message to connection', error as Error, {
        connectionId,
        type,
      });
      return false;
    }
  };

  public sendToUser = (userId: string, type: string, data?: any): boolean => {
    const connection = this.connectionManager.findConnectionByUserId(userId);
    if (!connection) {
      wsLogger.debug('No active connection found for user', { userId, type });
      return false;
    }

    return this.sendToConnection(connection.id, type, data);
  };

  // 🔥 MÉTODO COM LIMPEZA PROATIVA DE CONEXÕES MORTAS
  public broadcastToRoom = (roomId: string, type: string, data?: any, excludeConnectionId?: string): number => {
    console.log('🔥 BROADCAST: Tentando fazer broadcast', {
      roomId,
      type,
      hasData: !!data,
      excludeConnectionId,
      timestamp: new Date().toISOString()
    });

    const roomConnections = this.channelManager.getRoomConnections(roomId);

    // 🔥 LIMPEZA PROATIVA - NOVA LÓGICA
    const aliveConnections = new Set<string>();
    const deadConnections = new Set<string>();

    for (const connectionId of roomConnections) {
      const connection = this.connectionManager.getConnection(connectionId);
      if (connection && connection.ws.readyState === connection.ws.OPEN) {
        // Teste adicional: verificar se realmente pode enviar
        try {
          connection.ws.ping();
          aliveConnections.add(connectionId);
        } catch (error) {
          console.log('🧹 LIMPEZA: Conexão falhou no ping test', { connectionId, error: error.message });
          deadConnections.add(connectionId);
        }
      } else {
        console.log('🧹 LIMPEZA: Conexão não está OPEN', {
          connectionId,
          hasConnection: !!connection,
          readyState: connection?.ws.readyState
        });
        deadConnections.add(connectionId);
      }
    }

    // Remove conexões mortas do ChannelManager
    for (const deadId of deadConnections) {
      this.channelManager.removeConnectionFromAllRooms(deadId);
      this.connectionManager.removeConnection(deadId);
      console.log('🧹 LIMPEZA: Removida conexão morta', { connectionId: deadId });
    }

    console.log('🔥 BROADCAST: Conexões na sala (após limpeza)', {
      roomId,
      totalConnections: aliveConnections.size,
      connections: Array.from(aliveConnections),
      removed: deadConnections.size,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    for (const connectionId of aliveConnections) {
      if (excludeConnectionId && connectionId === excludeConnectionId) {
        console.log('🔥 BROADCAST: Pulando conexão excluída', { connectionId });
        continue;
      }

      const success = this.sendToConnection(connectionId, type, data);

      console.log('🔥 BROADCAST: Tentativa de envio', {
        connectionId,
        success,
        type,
        timestamp: new Date().toISOString()
      });

      if (success) {
        sentCount++;
      }
    }

    console.log('🔥 BROADCAST: Broadcast realizado', {
      roomId,
      type,
      totalConnections: aliveConnections.size,
      sentCount,
      timestamp: new Date().toISOString()
    });

    wsLogger.debug('Broadcast to room completed', {
      roomId,
      type,
      totalConnections: aliveConnections.size,
      sentCount,
      excludedConnection: excludeConnectionId,
    });

    return sentCount;
  };

  public broadcastToAll = (type: string, data?: any): number => {
    const allConnections = this.connectionManager.getAllConnections();
    let sentCount = 0;

    for (const [connectionId] of allConnections) {
      if (this.sendToConnection(connectionId, type, data)) {
        sentCount++;
      }
    }

    wsLogger.debug('Broadcast to all completed', {
      type,
      totalConnections: allConnections.size,
      sentCount,
    });

    return sentCount;
  };

  public getStats(): any {
    const connectionStats = this.connectionManager.getStats();
    const channelStats = this.channelManager.getStats();

    return {
      connections: connectionStats,
      channels: channelStats,
      games: {
        activeGames: this.gameEngine.getActiveGamesCount(),
        totalGames: this.gameEngine.getAllGames().length,
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        serverId: this.config.SERVICE_ID,
      },
    };
  }

  public async forceDisconnectUser(userId: string): Promise<boolean> {
    const connection = this.connectionManager.findConnectionByUserId(userId);
    if (!connection) {
      return false;
    }

    try {
      connection.ws.close(1000, 'Forced disconnect by admin');
      return true;
    } catch (error) {
      wsLogger.error('Failed to force disconnect user', error as Error, { userId });
      return false;
    }
  }

  public async cleanup(): Promise<void> {
    wsLogger.info('Starting WebSocket cleanup...');

    this.heartbeatManager.stop();

    const allConnections = this.connectionManager.getAllConnections();
    for (const [connectionId, connection] of allConnections) {
      try {
        connection.ws.close(1001, 'Server shutdown');
      } catch (error) {
        wsLogger.error('Error closing connection during cleanup', error as Error, { connectionId });
      }
    }

    this.connectionManager.cleanup();
    this.channelManager.cleanup();
    await this.gameEngine.cleanup();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    wsLogger.info('WebSocket cleanup completed');
  }
}