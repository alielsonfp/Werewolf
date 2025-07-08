// 🐺 LOBISOMEM ONLINE - WebSocket Manager (CORRIGIDO E FINALIZADO)

import { Server as HttpServer, IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import crypto from 'crypto';

import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { MessageRouter } from './MessageRouter';
import { HeartbeatManager } from './HeartbeatManager';

import { extractTokenFromWebSocketRequest, verifyAccessToken } from '@/config/jwt';
import { wsConfig } from '@/config/websocket';
import { wsLogger } from '@/utils/logger';

import type { IGameStateService, IEventBus, ConnectionContext, ConnectionMetadata, WebSocketConnection, URLParseResult } from '@/types';
import type { Config } from '@/config/environment';

export class WebSocketManager {
  public wss: WebSocketServer | null = null;
  public connectionManager: ConnectionManager;
  public channelManager: ChannelManager;
  public heartbeatManager: HeartbeatManager;

  private messageRouter: MessageRouter;
  private isShuttingDown = false;

  constructor(
    gameStateService: IGameStateService,
    eventBus: IEventBus,
    private config: Config,
  ) {
    this.connectionManager = new ConnectionManager();
    this.channelManager = new ChannelManager(this.connectionManager);
    this.heartbeatManager = new HeartbeatManager(this.connectionManager);

    this.messageRouter = new MessageRouter(
      this.connectionManager,
      this.channelManager,
      gameStateService,
      eventBus,
    );

    this.messageRouter.setBroadcastMethods(
      this.broadcastToRoom.bind(this),
      this.sendToUser.bind(this),
    );
  }

  public setupWebSocketServer(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true, ...wsConfig.serverOptions });

    httpServer.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

      if (!pathname.startsWith(wsConfig.path)) {
        wsLogger.warn('Upgrade recusado – caminho inválido', { pathname });
        socket.destroy();
        return;
      }

      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.heartbeatManager.start();
    wsLogger.info('WebSocket server attached to HTTP upgrade event.');
  }

  private _parseWebSocketURL(url: string): URLParseResult {
    try {
      const parsedUrl = new URL(url, 'http://localhost');
      const pathParts = parsedUrl.pathname.split('/').filter(p => p);
      if (pathParts[0] === 'ws' && pathParts[1] === 'room' && pathParts[2]) {
        return { isValid: true, path: parsedUrl.pathname, roomId: pathParts[2] };
      }
      return { isValid: true, path: parsedUrl.pathname };
    } catch {
      return { isValid: false, path: '' };
    }
  }

  private _extractConnectionMetadata(request: IncomingMessage): ConnectionMetadata {
    // CORREÇÃO FINAL: Iniciar o objeto apenas com propriedades obrigatórias.
    const metadata: ConnectionMetadata = {
      connectedAt: new Date(),
    };

    // Adicionar propriedades opcionais apenas se elas existirem.
    // Isso satisfaz a regra 'exactOptionalPropertyTypes'.
    if (request.socket.remoteAddress) {
      metadata.ip = request.socket.remoteAddress;
    }
    if (request.headers['user-agent']) {
      metadata.userAgent = request.headers['user-agent'];
    }
    if (request.headers.origin) {
      metadata.origin = request.headers.origin;
    }
    return metadata;
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    try {
      const token = extractTokenFromWebSocketRequest(request);
      if (!token) return ws.close(1008, 'Authentication required');

      const payload = verifyAccessToken(token);

      const urlInfo = this._parseWebSocketURL(request.url || '');
      if (!urlInfo.isValid) return ws.close(1008, 'Invalid WebSocket URL');

      const context: ConnectionContext = {
        userId: payload.userId,
        username: payload.username,
        serverId: this.config.SERVICE_ID,
        isSpectator: false,
        ...(urlInfo.roomId && { roomId: urlInfo.roomId }),
      };

      const connectionId = crypto.randomUUID();
      const newConnection: WebSocketConnection = {
        id: connectionId,
        ws,
        context,
        metadata: this._extractConnectionMetadata(request),
        isAlive: true,
        lastPing: Date.now(),
        reconnectAttempts: 0
      };

      this.connectionManager.addConnection(newConnection);

      wsLogger.info('WebSocket connection established', {
        connectionId,
        userId: context.userId,
        roomId: context.roomId,
      });

      this.setupConnectionHandlers(ws, connectionId);
      this.sendToConnection(connectionId, 'connected', { userId: context.userId });

      if (context.roomId) {
        await this.messageRouter.handleMessage(connectionId, {
          type: 'join-room',
          data: { roomId: context.roomId },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      wsLogger.error('Connection failed', error instanceof Error ? error : new Error('Unknown error'));
      ws.close(1008, 'Authentication failed');
    }
  }

  private setupConnectionHandlers(ws: WebSocket, connectionId: string): void {
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.messageRouter.handleMessage(connectionId, message);
      } catch { /* Ignora mensagens mal‑formadas */ }
    });

    ws.on('pong', () => this.heartbeatManager.handlePong(connectionId));
    ws.on('close', (code, reason) => this.handleDisconnection(connectionId, code, reason.toString()));
    ws.on('error', (error) => wsLogger.error('WS Connection Error', error, { connectionId }));
  }

  private handleDisconnection(connectionId: string, code: number, reason: string): void {
    const conn = this.connectionManager.getConnection(connectionId);
    if (!conn) return;

    wsLogger.info('Disconnected', {
      connectionId,
      userId: conn.context.userId,
      code,
      reason,
    });

    if (conn.context.roomId) {
      this.broadcastToRoom(
        conn.context.roomId,
        'player-left',
        { userId: conn.context.userId, username: conn.context.username },
        connectionId
      );
    }

    this.channelManager.removeConnectionFromAllRooms(connectionId);
    this.connectionManager.removeConnection(connectionId);
  }

  /* -------------------------------------------------------------------- */
  /*                          Métodos utilitários                         */
  /* -------------------------------------------------------------------- */

  private sendToConnection(id: string, type: string, data?: any): boolean {
    const conn = this.connectionManager.getConnection(id);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
      return true;
    }
    return false;
  }

  private broadcastToRoom(
    roomId: string,
    type: string,
    data?: any,
    excludeConnectionId?: string,
  ): number {
    return this.channelManager.broadcastToRoom(roomId, type, data, excludeConnectionId);
  }

  private sendToUser(userId: string, type: string, data?: any): boolean {
    const connId = this.connectionManager.getUserConnection(userId);
    return connId ? this.sendToConnection(connId, type, data) : false;
  }

  /* -------------------------------------------------------------------- */
  /*                          Métodos de manutenção                        */
  /* -------------------------------------------------------------------- */

  public getStats() {
    return {
      totalConnections: this.connectionManager.getConnectionCount(),
      activeRooms: this.channelManager.getActiveRoomsCount(),
      heartbeat: this.heartbeatManager.getStats(),
    };
  }

  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    wsLogger.info('Shutting down WebSocket server...');

    this.heartbeatManager.stop();
    this.wss?.close();

    this.connectionManager.cleanup();
    this.channelManager.cleanup();

    wsLogger.info('WebSocket server shutdown complete.');
  }
}