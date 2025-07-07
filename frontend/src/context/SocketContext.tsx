'use client';

import { createContext, useContext, ReactNode, useCallback, useRef, useState } from 'react';

// Tipos simplificados
export interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (url: string) => void;
  disconnect: () => void;
  sendMessage: (type: string, data?: any) => boolean;
}

const SocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback((url: string) => {
    // Validação básica
    if (!url || url.includes('undefined')) {
      console.error('❌ Invalid WebSocket URL:', url);
      return;
    }

    // Se já está conectado na mesma URL, não faz nada
    if (socketRef.current?.url === url && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected to', url);
      return;
    }

    // Desconecta conexão anterior se existir
    if (socketRef.current) {
      socketRef.current.close();
    }

    console.log('🔌 Connecting to WebSocket:', url);

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setSocket(ws);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Dispara evento customizado para componentes ouvirem
          window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }));
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setSocket(null);
        setIsConnected(false);
        socketRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting WebSocket');
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((type: string, data?: any): boolean => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type, data }));
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }
    }
    console.warn('⚠️ WebSocket not connected');
    return false;
  }, []);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
    sendMessage,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): WebSocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}