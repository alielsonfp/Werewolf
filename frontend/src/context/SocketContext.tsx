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

    // ✅ CORRIGIDO: Verificar se já está conectado na mesma URL com readyState
    if (socketRef.current?.url === url && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected to', url);
      return;
    }

    // ✅ CORRIGIDO: Verificar se há conexão pendente para a mesma URL
    if (socketRef.current?.url === url && socketRef.current.readyState === WebSocket.CONNECTING) {
      console.log('⏳ Connection already in progress for', url);
      return;
    }

    // Desconecta conexão anterior se existir
    if (socketRef.current) {
      console.log('🔄 Closing previous connection');
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

        // 🚨 CORREÇÃO MÍNIMA: Emitir evento 'connected' para aguardar confirmação
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: { type: 'connected', data: { timestamp: Date.now() } }
        }));
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

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        setSocket(null);
        setIsConnected(false);

        // ✅ CORRIGIDO: Só limpar ref se for a conexão atual
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        // ✅ ADICIONADO: Atualizar estado em caso de erro
        setSocket(null);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting WebSocket');

      // ✅ CORRIGIDO: Verificar estado antes de fechar
      if (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }

      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  // ✅ CORRIGIDO: Usar readyState real do socket em vez do estado React
  const sendMessage = useCallback((type: string, data?: any): boolean => {
    // ✅ Verificar estado real do WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type,
          data,
          timestamp: new Date().toISOString(),
        };
        socketRef.current.send(JSON.stringify(message));
        console.log('📤 Message sent:', type, data);
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }
    }

    // ✅ MELHOR: Log mais informativo sobre o estado atual
    const currentState = socketRef.current?.readyState;
    const stateNames: Record<number, string> = {
      [WebSocket.CONNECTING]: 'CONNECTING',
      [WebSocket.OPEN]: 'OPEN',
      [WebSocket.CLOSING]: 'CLOSING',
      [WebSocket.CLOSED]: 'CLOSED'
    };

    console.warn('⚠️ Cannot send message - WebSocket state:',
      currentState !== undefined ? stateNames[currentState] : 'NULL');
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