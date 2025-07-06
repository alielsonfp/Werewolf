'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { WebSocketMessage, SocketEvent, GameState, ChatMessage } from '@/types';
import { useAuth } from './AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket'; // ✅ Importar o hook
import { toast } from 'react-hot-toast';

// =============================================================================
// CONTEXT TYPES
// =============================================================================
type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface SocketContextType {
  // Connection state
  socket: WebSocket | null;
  status: SocketStatus;
  isConnected: boolean;
  pingLatency: number;

  // Room state
  currentRoomId: string | null;
  roomPlayers: any[];

  // Game state
  gameState: GameState | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data?: any) => boolean;

  // Game actions
  joinRoom: (roomId: string, asSpectator?: boolean) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => boolean;
  startGame: () => boolean;
  sendGameAction: (type: string, data?: any) => boolean;
  sendVote: (targetId: string) => boolean;
  sendChatMessage: (message: string, channel?: string) => boolean;

  // Event listeners
  onRoomUpdate: (callback: (players: any[]) => void) => () => void;
  onGameUpdate: (callback: (gameState: GameState) => void) => () => void;
  onChatMessage: (callback: (message: ChatMessage) => void) => () => void;
  onSystemMessage: (callback: (message: string) => void) => () => void;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================
interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { getToken, isAuthenticated, isLoading: authLoading } = useAuth();

  // Room state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Event listeners
  const [roomUpdateCallbacks] = useState<Set<(players: any[]) => void>>(new Set());
  const [gameUpdateCallbacks] = useState<Set<(gameState: GameState) => void>>(new Set());
  const [chatMessageCallbacks] = useState<Set<(message: ChatMessage) => void>>(new Set());
  const [systemMessageCallbacks] = useState<Set<(message: string) => void>>(new Set());

  // ✅ Construir URL do WebSocket dinamicamente
  const buildWebSocketUrl = useCallback(() => {
    if (!isAuthenticated || authLoading) return '';

    const token = getToken();
    if (!token) return '';

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const url = new URL('/ws', wsUrl.replace('http', 'ws'));

    if (currentRoomId) {
      url.pathname += `/${currentRoomId}`;
    }

    url.searchParams.set('token', token);
    return url.toString();
  }, [isAuthenticated, authLoading, getToken, currentRoomId]);

  // ✅ Usar o hook useWebSocket com configurações otimizadas
  const {
    socket,
    status,
    isConnected,
    pingLatency,
    sendMessage: wsendMessage,
    connect: wsConnect,
    disconnect: wsDisconnect
  } = useWebSocket(buildWebSocketUrl(), {
    autoConnect: isAuthenticated && !authLoading && buildWebSocketUrl() !== '',
    heartbeatInterval: 30000, // 30 segundos
    maxReconnectAttempts: 5,
    reconnectBackoff: 'exponential'
  });

  // =============================================================================
  // ✅ MELHORADA: MESSAGE HANDLING COM LISTENERS DE EVENTOS
  // =============================================================================
  const handleWebSocketMessage = useCallback((event: CustomEvent) => {
    const message: WebSocketMessage = event.detail;
    console.log('📨 Received:', message.type, message.data);

    switch (message.type) {
      case SocketEvent.CONNECT:
      case 'connected':
        toast.success('Conectado com sucesso! 🎮');
        break;

      case SocketEvent.ERROR:
      case 'error':
        const errorMsg = message.data?.message || 'Erro no servidor';

        // Não mostrar toast para erros de tipo de mensagem desconhecida
        if (message.data?.code !== 'UNKNOWN_MESSAGE_TYPE') {
          toast.error(errorMsg);
        } else {
          console.warn('Unknown message type:', message.data);
        }

        // Se erro de autenticação, desconectar
        if (message.data?.code === 1008 || errorMsg.includes('Authentication')) {
          console.warn('🔒 Authentication error, disconnecting...');
          wsDisconnect();
        }
        break;

      case 'room-joined':
        setCurrentRoomId(message.data.room.id);
        setRoomPlayers(message.data.players || []);
        roomUpdateCallbacks.forEach(callback => callback(message.data.players || []));
        toast.success(`Entrou na sala: ${message.data.room.name}`);
        break;

      case 'room-left':
        setCurrentRoomId(null);
        setRoomPlayers([]);
        setGameState(null);
        toast.info('Saiu da sala');
        break;

      case 'player-joined':
      case 'player-left':
      case 'player-ready':
        // Update room players
        if (message.data?.players) {
          setRoomPlayers(message.data.players);
          roomUpdateCallbacks.forEach(callback => callback(message.data.players));
        }
        break;

      case 'game-started':
      case 'game-state':
        if (message.data) {
          setGameState(message.data);
          gameUpdateCallbacks.forEach(callback => callback(message.data));
        }
        break;

      case 'chat-message':
        if (message.data) {
          chatMessageCallbacks.forEach(callback => callback(message.data));
        }
        break;

      case 'system-message':
        const systemMsg = message.data?.message || message.data;
        if (systemMsg) {
          systemMessageCallbacks.forEach(callback => callback(systemMsg));
          toast.info(systemMsg);
        }
        break;

      case 'phase-change':
        toast.info(`🌅 Fase: ${message.data?.phase} (${Math.floor(message.data?.timeLeft / 1000)}s)`);
        break;

      case 'player-died':
        toast.error(`💀 ${message.data?.username} foi eliminado!`);
        break;

      case 'game-ended':
        toast.success(`🏆 Fim de jogo! ${message.data?.winners?.faction} venceu!`);
        break;

      default:
        console.log('📨 Unhandled message type:', message.type);
    }
  }, [roomUpdateCallbacks, gameUpdateCallbacks, chatMessageCallbacks, systemMessageCallbacks, wsDisconnect]);

  // ✅ Registrar listener para mensagens WebSocket
  useEffect(() => {
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);
    return () => window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener);
  }, [handleWebSocketMessage]);

  // =============================================================================
  // ✅ SIMPLIFIED ACTIONS USING WEBSOCKET HOOK
  // =============================================================================
  const connect = useCallback(() => {
    if (isAuthenticated && !authLoading) {
      wsConnect();
    }
  }, [isAuthenticated, authLoading, wsConnect]);

  const disconnect = useCallback(() => {
    wsDisconnect();
    // Clear state
    setCurrentRoomId(null);
    setRoomPlayers([]);
    setGameState(null);
  }, [wsDisconnect]);

  const sendMessage = useCallback((type: string, data?: any): boolean => {
    return wsendMessage(type, data);
  }, [wsendMessage]);

  // =============================================================================
  // ✅ GAME ACTIONS WITH RETURN VALUES
  // =============================================================================
  const joinRoom = useCallback((roomId: string, asSpectator = false) => {
    // Atualizar o currentRoomId vai fazer o hook reconectar automaticamente
    setCurrentRoomId(roomId);
    // Enviar mensagem de join
    sendMessage(SocketEvent.JOIN_ROOM, { roomId, asSpectator });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    if (currentRoomId) {
      sendMessage(SocketEvent.LEAVE_ROOM, { roomId: currentRoomId });
      setCurrentRoomId(null);
    }
  }, [currentRoomId, sendMessage]);

  const setReady = useCallback((ready: boolean): boolean => {
    return sendMessage(SocketEvent.PLAYER_READY, { ready });
  }, [sendMessage]);

  const startGame = useCallback((): boolean => {
    return sendMessage(SocketEvent.START_GAME, {});
  }, [sendMessage]);

  const sendGameAction = useCallback((type: string, data?: any): boolean => {
    return sendMessage(SocketEvent.GAME_ACTION, { type, ...data });
  }, [sendMessage]);

  const sendVote = useCallback((targetId: string): boolean => {
    return sendMessage(SocketEvent.VOTE, { targetId });
  }, [sendMessage]);

  const sendChatMessage = useCallback((message: string, channel = 'public'): boolean => {
    return sendMessage(SocketEvent.CHAT_MESSAGE, { message, channel });
  }, [sendMessage]);

  // =============================================================================
  // EVENT LISTENERS
  // =============================================================================
  const onRoomUpdate = useCallback((callback: (players: any[]) => void) => {
    roomUpdateCallbacks.add(callback);
    return () => roomUpdateCallbacks.delete(callback);
  }, [roomUpdateCallbacks]);

  const onGameUpdate = useCallback((callback: (gameState: GameState) => void) => {
    gameUpdateCallbacks.add(callback);
    return () => gameUpdateCallbacks.delete(callback);
  }, [gameUpdateCallbacks]);

  const onChatMessage = useCallback((callback: (message: ChatMessage) => void) => {
    chatMessageCallbacks.add(callback);
    return () => chatMessageCallbacks.delete(callback);
  }, [chatMessageCallbacks]);

  const onSystemMessage = useCallback((callback: (message: string) => void) => {
    systemMessageCallbacks.add(callback);
    return () => systemMessageCallbacks.delete(callback);
  }, [systemMessageCallbacks]);

  // =============================================================================
  // ✅ LIFECYCLE MANAGEMENT
  // =============================================================================
  useEffect(() => {
    // Reconectar quando estado de auth mudar
    if (isAuthenticated && !authLoading && status === 'disconnected') {
      console.log('🔐 User authenticated, connecting WebSocket...');
      connect();
    }

    // Desconectar quando não autenticado
    if (!isAuthenticated && !authLoading && isConnected) {
      console.log('🔐 User not authenticated, disconnecting WebSocket...');
      disconnect();
    }
  }, [isAuthenticated, authLoading, status, isConnected, connect, disconnect]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const contextValue: SocketContextType = {
    // Connection state
    socket,
    status,
    isConnected,
    pingLatency,

    // Room state
    currentRoomId,
    roomPlayers,

    // Game state
    gameState,

    // Actions
    connect,
    disconnect,
    sendMessage,

    // Game actions
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    sendGameAction,
    sendVote,
    sendChatMessage,

    // Event listeners
    onRoomUpdate,
    onGameUpdate,
    onChatMessage,
    onSystemMessage,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}