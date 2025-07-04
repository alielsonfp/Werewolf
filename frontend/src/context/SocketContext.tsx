'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { WebSocketMessage, SocketEvent, GameState, ChatMessage } from '@/types';
import { useAuth } from './AuthContext';
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

  // Room state
  currentRoomId: string | null;
  roomPlayers: any[];

  // Game state
  gameState: GameState | null;

  // Actions
  connect: (roomId?: string) => void;
  disconnect: () => void;
  sendMessage: (type: string, data?: any) => void;

  // Game actions
  joinRoom: (roomId: string, asSpectator?: boolean) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  sendGameAction: (type: string, data?: any) => void;
  sendVote: (targetId: string) => void;
  sendChatMessage: (message: string, channel?: string) => void;

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
  const { getToken, isAuthenticated } = useAuth();

  // Connection state
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const isConnected = status === 'connected';

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================
  const connect = useCallback((roomId?: string) => {
    if (!isAuthenticated) {
      console.warn('Cannot connect WebSocket: User not authenticated');
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    setStatus('connecting');

    try {
      const token = getToken();
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

      // Build WebSocket URL with authentication
      const url = new URL('/ws', wsUrl.replace('http', 'ws'));
      if (roomId) {
        url.pathname += `/${roomId}`;
      }

      // Create WebSocket connection
      const newSocket = new WebSocket(url.toString());

      // Store token for authentication after connection
      (newSocket as any)._authToken = token;

      // Connection opened
      newSocket.onopen = () => {
        console.log('🔌 WebSocket connected');
        setStatus('connected');
        setReconnectAttempts(0);

        // Send authentication
        if (token) {
          newSocket.send(JSON.stringify({
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          }));
        }

        toast.success('Conectado ao servidor! 🎮');
      };

      // Message received
      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Connection closed
      newSocket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setStatus('disconnected');
        setSocket(null);

        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && isAuthenticated) {
          scheduleReconnect();
        }
      };

      // Connection error
      newSocket.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
        setStatus('error');
        toast.error('Erro de conexão com o servidor');
      };

      setSocket(newSocket);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus('error');
      toast.error('Falha ao conectar com o servidor');
    }
  }, [isAuthenticated, getToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }

    if (socket) {
      setStatus('disconnected');
      socket.close(1000, 'User disconnected');
      setSocket(null);
    }

    // Clear state
    setCurrentRoomId(null);
    setRoomPlayers([]);
    setGameState(null);
    setReconnectAttempts(0);
  }, [socket, reconnectTimeout]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= 5) {
      toast.error('Falha ao reconectar. Recarregue a página.');
      return;
    }

    setStatus('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff

    const timeout = setTimeout(() => {
      console.log(`🔄 Attempting reconnect (${reconnectAttempts + 1}/5)...`);
      connect(currentRoomId || undefined);
    }, delay);

    setReconnectTimeout(timeout);
  }, [reconnectAttempts, connect, currentRoomId]);

  // =============================================================================
  // MESSAGE HANDLING
  // =============================================================================
  const sendMessage = useCallback((type: string, data?: any) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
      messageId: Math.random().toString(36).substr(2, 9),
    };

    socket.send(JSON.stringify(message));
  }, [socket]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Received:', message.type, message.data);

    switch (message.type) {
      case SocketEvent.CONNECT:
        toast.success('Conectado com sucesso!');
        break;

      case SocketEvent.ERROR:
        toast.error(message.data?.message || 'Erro no servidor');
        break;

      case 'room-joined':
        setCurrentRoomId(message.data.room.id);
        setRoomPlayers(message.data.players || []);
        roomUpdateCallbacks.forEach(callback => callback(message.data.players || []));
        break;

      case 'room-left':
        setCurrentRoomId(null);
        setRoomPlayers([]);
        setGameState(null);
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
    }
  }, [roomUpdateCallbacks, gameUpdateCallbacks, chatMessageCallbacks, systemMessageCallbacks]);

  // =============================================================================
  // GAME ACTIONS
  // =============================================================================
  const joinRoom = useCallback((roomId: string, asSpectator = false) => {
    sendMessage(SocketEvent.JOIN_ROOM, { roomId, asSpectator });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    sendMessage(SocketEvent.LEAVE_ROOM);
  }, [sendMessage]);

  const setReady = useCallback((ready: boolean) => {
    sendMessage(SocketEvent.PLAYER_READY, { ready });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage(SocketEvent.START_GAME);
  }, [sendMessage]);

  const sendGameAction = useCallback((type: string, data?: any) => {
    sendMessage(SocketEvent.GAME_ACTION, { type, ...data });
  }, [sendMessage]);

  const sendVote = useCallback((targetId: string) => {
    sendMessage(SocketEvent.VOTE, { targetId });
  }, [sendMessage]);

  const sendChatMessage = useCallback((message: string, channel = 'public') => {
    sendMessage(SocketEvent.CHAT_MESSAGE, { message, channel });
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
  // LIFECYCLE
  // =============================================================================
  useEffect(() => {
    // Auto-connect when authenticated
    if (isAuthenticated && status === 'disconnected') {
      connect();
    }

    // Auto-disconnect when not authenticated
    if (!isAuthenticated && socket) {
      disconnect();
    }
  }, [isAuthenticated, status, connect, disconnect, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  const contextValue: SocketContextType = {
    // Connection state
    socket,
    status,
    isConnected,

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