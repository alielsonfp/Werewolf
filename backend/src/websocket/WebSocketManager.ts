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

      const context: ConnectionContext = {
        userId: jwtPayload.userId,
        username: jwtPayload.username,
        serverId: this.config.SERVICE_ID,
        isSpectator: false,
        roomId: urlInfo.roomId,
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

      // Auto-join room if specified in URL
      if (context.roomId) {
        await this.messageRouter.handleMessage(connectionId, {
          type: 'join-room',
          data: { roomId: context.roomId }
        });
      }

      wsLogger.info('WebSocket connection established', {
        connectionId,
        userId: context.userId,
        username: context.username,
        roomId: context.roomId,
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

  public broadcastToRoom = (roomId: string, type: string, data?: any, excludeConnectionId?: string): number => {
    const roomConnections = this.channelManager.getRoomConnections(roomId);
    let sentCount = 0;

    for (const connectionId of roomConnections) {
      if (excludeConnectionId && connectionId === excludeConnectionId) {
        continue;
      }

      if (this.sendToConnection(connectionId, type, data)) {
        sentCount++;
      }
    }

    wsLogger.debug('Broadcast to room completed', {
      roomId,
      type,
      totalConnections: roomConnections.size,
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