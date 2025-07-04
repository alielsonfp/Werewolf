// 🐺 LOBISOMEM ONLINE - WebSocket Manager (CORREÇÃO DEFINITIVA)
import { Server as HttpServer } from 'http';
// CORREÇÃO: Importa 'WebSocket' e 'WebSocketServer' como valores, não apenas como tipos.
import WebSocket, { WebSocketServer } from 'ws';
import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { MessageRouter } from './MessageRouter';
import { HeartbeatManager } from './HeartbeatManager';
import { extractTokenFromWebSocketRequest, verifyAccessToken } from '@/config/jwt';
import { wsConfig, parseWebSocketURL, extractConnectionMetadata } from '@/config/websocket';
import { wsLogger } from '@/utils/logger';
import type { IncomingMessage } from 'http';
import type { IGameStateService, IEventBus, ConnectionContext } from '@/types';
import type { Config } from '@/config/environment';

export class WebSocketManager {
    public wss: WebSocketServer | null = null; // Tornar público para acesso externo
    public connectionManager: ConnectionManager;
    public channelManager: ChannelManager;
    private messageRouter: MessageRouter;
    public heartbeatManager: HeartbeatManager; // Tornar público
    private isShuttingDown = false;

    constructor(
        gameStateService: IGameStateService,
        eventBus: IEventBus,
        private config: Config
    ) {
        this.connectionManager = new ConnectionManager();
        this.channelManager = new ChannelManager(this.connectionManager);
        this.heartbeatManager = new HeartbeatManager(this.connectionManager);
        this.messageRouter = new MessageRouter(
            this.connectionManager, this.channelManager, gameStateService, eventBus
        );
        this.messageRouter.setBroadcastMethods(
            this.broadcastToRoom.bind(this), this.sendToUser.bind(this)
        );
    }

    setupWebSocketServer(httpServer: HttpServer): void {
        this.wss = new WebSocketServer({ server: httpServer, path: wsConfig.path, ...wsConfig.server });
        this.wss.on('connection', this.handleConnection.bind(this));
        this.heartbeatManager.start();
        wsLogger.info('WebSocket server started');
    }

    private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
        // ... (lógica de conexão permanece a mesma da sua versão original)
        let connectionId: string | undefined;
        try {
            const token = extractTokenFromWebSocketRequest(request);
            if (!token) return ws.close(1008, 'Authentication required');

            const payload = verifyAccessToken(token);
            const urlInfo = parseWebSocketURL(request.url || '');
            if (!urlInfo.isValid) return ws.close(1008, 'Invalid WebSocket URL');

            const context: ConnectionContext = {
                userId: payload.userId,
                username: payload.username,
                serverId: this.config.SERVICE_ID,
                isSpectator: false,
            };
            if (urlInfo.roomId) context.roomId = urlInfo.roomId;

            const metadata = extractConnectionMetadata(request);
            connectionId = this.connectionManager.addConnection(ws, context, metadata);
            wsLogger.info('WebSocket connection established', { connectionId, userId: context.userId, roomId: context.roomId });

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
            } catch (e) { /* ignora erro de parse */ }
        });
        ws.on('pong', () => this.heartbeatManager.handlePong(connectionId));
        ws.on('close', (code, reason) => this.handleDisconnection(connectionId, code, reason.toString()));
        ws.on('error', error => wsLogger.error('WS Connection Error', error, { connectionId }));
    }

    private handleDisconnection(connectionId: string, code: number, reason: string): void {
        const conn = this.connectionManager.getConnection(connectionId);
        if (!conn) return;
        wsLogger.info('Disconnected', { connectionId, userId: conn.context.userId, code, reason });
        if (conn.context.roomId) {
            this.broadcastToRoom(conn.context.roomId, 'player-left', { userId: conn.context.userId, username: conn.context.username }, connectionId);
        }
        this.channelManager.removeConnectionFromAllRooms(connectionId);
        this.connectionManager.removeConnection(connectionId);
    }

    private sendToConnection(id: string, type: string, data?: any) {
        const conn = this.connectionManager.getConnection(id);
        // CORREÇÃO: `WebSocket.OPEN` é um valor estático, por isso a importação de valor é necessária.
        if (conn && conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify({ type, data }));
            return true;
        }
        return false;
    }

    private broadcastToRoom(roomId: string, type: string, data?: any, excludeConnectionId?: string): number {
        return this.channelManager.broadcastToRoom(roomId, type, data, excludeConnectionId);
    }

    private sendToUser(userId: string, type: string, data?: any): boolean {
        const connId = this.connectionManager.getUserConnection(userId);
        return connId ? this.sendToConnection(connId, type, data) : false;
    }

    // CORREÇÃO: Adicionando os métodos públicos que faltavam para `server.ts`
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