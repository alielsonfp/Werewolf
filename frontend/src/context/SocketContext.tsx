// 🔧 CORREÇÃO NO SocketContext.tsx
// Versão completa com logs de debug detalhados

'use client';

import { createContext, useContext, ReactNode, useCallback, useRef, useState, useEffect } from 'react';

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
  console.log('🚀 [DEBUG] SocketProvider renderizado!', new Date().toISOString());

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // ✅ useEffect PARA EXPOSIÇÃO GLOBAL DO SOCKET COM DEBUG DETALHADO
  useEffect(() => {
    console.log('🔍 [DEBUG] useEffect do socket executou:', {
      windowExists: typeof window !== 'undefined',
      socketExists: !!socket,
      socketReadyState: socket?.readyState,
      socketUrl: socket?.url,
      isConnected,
      timestamp: new Date().toISOString()
    });

    if (typeof window !== 'undefined' && socket) {
      // Expor socket globalmente para o ReconnectBanner
      (window as any).socket = socket;
      console.log('✅ [DEBUG] Socket EXPOSTO globalmente!', {
        socketExists: !!socket,
        isConnected,
        socketUrl: socket.url,
        socketReadyState: socket.readyState
      });
    } else {
      console.log('❌ [DEBUG] Socket NÃO foi exposto:', {
        noWindow: typeof window === 'undefined',
        noSocket: !socket,
        socketState: socket?.readyState
      });
    }

    // Cleanup: remover socket global quando componente for desmontado
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).socket = null;
        console.log('🧹 [DEBUG] Socket global removido no cleanup');
      }
    };
  }, [socket, isConnected]);

  const connect = useCallback((url: string) => {
    // ✅ LOG DETALHADO DA FUNÇÃO CONNECT
    console.log('🔌 [SocketContext] A função connect foi chamada.', {
      url,
      currentState: socketRef.current?.readyState,
      currentUrl: socketRef.current?.url,
      isCurrentSocket: socketRef.current?.url === url,
      timestamp: new Date().toISOString()
    });

    // Validação básica
    if (!url || url.includes('undefined')) {
      console.error('❌ [SocketContext] Invalid WebSocket URL:', url);
      return;
    }

    // ✅ CORRIGIDO: Verificar se já está conectado na mesma URL com readyState
    if (socketRef.current?.url === url && socketRef.current.readyState === WebSocket.OPEN) {
      console.warn('⚠️ [SocketContext] Conexão já existe e está aberta. Ignorando chamada.');
      return;
    }

    // ✅ CORRIGIDO: Verificar se há conexão pendente para a mesma URL
    if (socketRef.current?.url === url && socketRef.current.readyState === WebSocket.CONNECTING) {
      console.warn('⏳ [SocketContext] Connection already in progress for', url);
      return;
    }

    // Desconecta conexão anterior se existir
    if (socketRef.current) {
      console.log('🔄 [SocketContext] Desconectando conexão antiga antes de criar uma nova.');
      socketRef.current.close();
    }

    console.log('🚀 [SocketContext] Criando nova instância de WebSocket...');

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [SocketContext] WebSocket connected - DEBUG');
        setSocket(ws);
        setIsConnected(true);
        console.log('🔄 [DEBUG] Estados atualizados:', {
          setSocket: !!ws,
          setIsConnected: true,
          wsUrl: ws.url,
          wsReadyState: ws.readyState
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [SocketContext] Message received:', message.type, message.data);
          // Dispara evento customizado para componentes ouvirem
          window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }));
        } catch (error) {
          console.error('❌ [SocketContext] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 [SocketContext] WebSocket disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        setSocket(null);
        setIsConnected(false);
        console.log('🔄 [DEBUG] Estados atualizados no close:', {
          setSocket: null,
          setIsConnected: false
        });

        // ✅ CORRIGIDO: Só limpar ref se for a conexão atual
        if (socketRef.current === ws) {
          socketRef.current = null;
          console.log('🧹 [DEBUG] socketRef.current limpo');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [SocketContext] WebSocket error:', error);
        // ✅ ADICIONADO: Atualizar estado em caso de erro
        setSocket(null);
        setIsConnected(false);
        console.log('🔄 [DEBUG] Estados atualizados no error:', {
          setSocket: null,
          setIsConnected: false
        });
      };

    } catch (error) {
      console.error('❌ [SocketContext] Failed to create WebSocket:', error);
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 [SocketContext] Disconnect chamado');

    if (socketRef.current) {
      console.log('🔌 [SocketContext] Disconnecting WebSocket', {
        currentState: socketRef.current.readyState,
        url: socketRef.current.url
      });

      // ✅ CORRIGIDO: Verificar estado antes de fechar
      if (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }

      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    } else {
      console.log('🔌 [SocketContext] Nenhuma conexão para desconectar');
    }
  }, []);

  // ✅ CORRIGIDO: Usar readyState real do socket em vez do estado React
  const sendMessage = useCallback((type: string, data?: any): boolean => {
    // ✅ LOG DETALHADO DE CADA MENSAGEM ENVIADA
    console.log('📤 [SocketContext] Enviando mensagem', {
      type,
      data,
      socketState: socketRef.current?.readyState,
      socketUrl: socketRef.current?.url,
      timestamp: new Date().toISOString()
    });

    // ✅ Verificar estado real do WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type,
          data,
          timestamp: new Date().toISOString(),
        };
        socketRef.current.send(JSON.stringify(message));
        console.log('✅ [SocketContext] Mensagem enviada com sucesso', { type, data });
        return true;
      } catch (error) {
        console.error('❌ [SocketContext] Erro ao enviar mensagem:', error);
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

    console.warn('⚠️ [SocketContext] Cannot send message - WebSocket state:',
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

  console.log('🔄 [DEBUG] SocketProvider renderizando com value:', {
    socketExists: !!value.socket,
    isConnected: value.isConnected,
    socketUrl: value.socket?.url,
    socketReadyState: value.socket?.readyState
  });

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

  console.log('🎯 [DEBUG] useSocket chamado:', {
    contextExists: !!context,
    socketExists: !!context.socket,
    isConnected: context.isConnected,
    socketUrl: context.socket?.url
  });

  return context;
}