// 🐺 LOBISOMEM ONLINE - WebSocket Manager (CORREÇÃO DEFINITIVA)

import { Server as HttpServer, IncomingMessage } from 'http';
// Importa 'WebSocket' COMO VALOR para acessar WebSocket.OPEN, além do servidor.
import WebSocket, { WebSocketServer } from 'ws';

import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { MessageRouter } from './MessageRouter';
import { HeartbeatManager } from './HeartbeatManager';

import {
  extractTokenFromWebSocketRequest,
  verifyAccessToken,
} from '@/config/jwt';
import {
  wsConfig,
  parseWebSocketURL,
  extractConnectionMetadata,
} from '@/config/websocket';
import { wsLogger } from '@/utils/logger';

import type { IGameStateService, IEventBus, ConnectionContext } from '@/types';
import type { Config } from '@/config/environment';

export class WebSocketManager {
  /**
   * Instância do servidor WS (pública para exibir stats se necessário)
   */
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

  /**
   * Inicializa o WebSocketServer acoplado ao httpServer, interceptando o
   * evento 'upgrade' para permitir rotas dinâmicas como /ws/:roomId.
   */
  public setupWebSocketServer(httpServer: HttpServer): void {
    // 1. Cria o WSS sem servidor HTTP direto nem path fixo.
    this.wss = new WebSocketServer({ noServer: true, ...wsConfig.server });

    // 2. Intercepta cada tentativa de upgrade (HTTP ➜ WS).
    httpServer.on('upgrade', (request, socket, head) => {
      // Usa a URL para checar se começa com o path base (ex: /ws)
      const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

      if (!pathname.startsWith(wsConfig.path)) {
        // Caminho não permitido → derruba a conexão.
        wsLogger.warn('Upgrade recusado – caminho inválido', { pathname });
        socket.destroy();
        return;
      }

      // 3. Aceita o upgrade; delega para o WSS processar.
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });

    // Listener de novas conexões WebSocket.
    this.wss.on('connection', this.handleConnection.bind(this));

    // Inicia batimentos cardíacos.
    this.heartbeatManager.start();

    wsLogger.info('WebSocket server attached to HTTP upgrade event.');
  }

  /**
   * Processo de handshake, autenticação e atribuição da conexão.
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    let connectionId: string | undefined;

    try {
      // 1. Valida token JWT.
      const token = extractTokenFromWebSocketRequest(request);
      if (!token) {
        return ws.close(1008, 'Authentication required');
      }

      const payload = verifyAccessToken(token);

      // 2. Extrai e valida o roomId da URL.
      const urlInfo = parseWebSocketURL(request.url || '');
      if (!urlInfo.isValid) {
        return ws.close(1008, 'Invalid WebSocket URL');
      }

      // 3. Monta contexto da conexão.
      const context: ConnectionContext = {
        userId: payload.userId,
        username: payload.username,
        serverId: this.config.SERVICE_ID,
        isSpectator: false,
      };
      if (urlInfo.roomId) context.roomId = urlInfo.roomId;

      const metadata = extractConnectionMetadata(request);

      // 4. Registra conexão.
      connectionId = this.connectionManager.addConnection(ws, context, metadata);
      wsLogger.info('WebSocket connection established', {
        connectionId,
        userId: context.userId,
        roomId: context.roomId,
      });

      // 5. Configura handlers de mensagem / ping / close / error.
      this.setupConnectionHandlers(ws, connectionId);

      // 6. Confirma conexão ao cliente.
      this.sendToConnection(connectionId, 'connected', { userId: context.userId });

      // 7. Auto‑join se veio com roomId.
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

  /**
   * Define handlers para mensagens, pong, close, error.
   */
  private setupConnectionHandlers(ws: WebSocket, connectionId: string): void {
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.messageRouter.handleMessage(connectionId, message);
      } catch {
        // Ignora mensagens mal‑formadas
      }
    });

    ws.on('pong', () => this.heartbeatManager.handlePong(connectionId));

    ws.on('close', (code, reason) =>
      this.handleDisconnection(connectionId, code, reason.toString()),
    );

    ws.on('error', (error) =>
      wsLogger.error('WS Connection Error', error, { connectionId }),
    );
  }

  /**
   * Limpeza ao desconectar.
   */
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
        {
          userId: conn.context.userId,
          username: conn.context.username,
        },
        connectionId,
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
      conn.ws.send(JSON.stringify({ type, data }));
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
    this.connectionManager.clear();
    this.channelManager.clear();

    wsLogger.info('WebSocket server shutdown complete.');
  }
}
