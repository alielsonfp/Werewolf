import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WebSocketMessage } from '@/types';
import { toast } from 'react-hot-toast';

type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  status: SocketStatus;
  isConnected: boolean;
  pingLatency: number;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data?: any) => boolean;
}

export function useWebSocket(roomId: string | null): UseWebSocketReturn {
  const { getToken, isAuthenticated } = useAuth();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [lastPingTime, setLastPingTime] = useState<number>(0);
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const maxReconnectAttempts = 5;
  const heartbeatInterval = 30000; // 30 segundos
  const pingTimeout = 10000; // 10 segundos para timeout do ping

  const handleMessage = useCallback((message: any, ws: WebSocket) => {
    const { type, data } = message;

    switch (type) {
      case 'ping':
        // Responder ao ping do servidor conforme documentação
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'pong':
        // Calcular latência do heartbeat
        const now = Date.now();
        if (lastPingTime) {
          setPingLatency(now - lastPingTime);
        }
        // Limpar timeout do ping
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        break;

      case 'connected':
        console.log('✅ WebSocket connection confirmed by server');
        toast.success('Conectado à sala!');
        break;

      case 'error':
        console.error('❌ Server error:', data);
        toast.error(data?.message || 'Erro no servidor');
        break;

      default:
        // Outros tipos de mensagem serão tratados pelos componentes
        console.log('📨 Received message:', type, data);
    }
  }, [lastPingTime]);

  const startHeartbeat = useCallback((ws: WebSocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        setLastPingTime(pingTime);

        // Enviar ping
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date(pingTime).toISOString()
        }));

        // Configurar timeout para detectar conexão perdida
        pingTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Ping timeout - connection may be lost');
          ws.close(1000, 'Ping timeout');
        }, pingTimeout);
      }
    }, heartbeatInterval);
  }, [pingTimeout]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setStatus('error');
      toast.error('Não foi possível reconectar. Verifique sua conexão.');
      return;
    }

    setStatus('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts]);

  const connect = useCallback(() => {
    if (!roomId || !isAuthenticated) {
      console.warn('❌ Cannot connect: missing roomId or not authenticated');
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('❌ Cannot connect: no auth token');
      return;
    }

    setStatus('connecting');

    try {
      // URL conforme documentação: incluir token como query parameter
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      const url = new URL('/ws', wsUrl.replace('http', 'ws'));
      if (roomId) {
        url.pathname += `/${roomId}`;
      }
      url.searchParams.set('token', token);

      console.log('🔌 Connecting to WebSocket:', url.toString());
      const newSocket = new WebSocket(url.toString());

      newSocket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setStatus('connected');
        setReconnectAttempts(0);

        // Iniciar heartbeat
        startHeartbeat(newSocket);

        // Enviar join-room conforme contrato da documentação
        newSocket.send(JSON.stringify({
          type: 'join-room',
          data: { roomId },
          timestamp: new Date().toISOString()
        }));
      };

      newSocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected', event.code, event.reason);
        setStatus('disconnected');
        stopHeartbeat();

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatus('error');
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message, newSocket);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      setSocket(newSocket);

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setStatus('error');
    }
  }, [roomId, isAuthenticated, getToken, handleMessage, startHeartbeat, stopHeartbeat, scheduleReconnect]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, 'User disconnect');
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    setSocket(null);
    setStatus('disconnected');
    setReconnectAttempts(0);
  }, [socket, stopHeartbeat]);

  const sendMessage = useCallback((type: string, data?: any): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString()
      };

      try {
        socket.send(JSON.stringify(message));
        console.log('📤 Sent message:', type, data);
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        return false;
      }
    }

    console.warn('⚠️ Cannot send message: WebSocket not connected');
    return false;
  }, [socket]);

  // Conectar automaticamente quando roomId muda
  useEffect(() => {
    if (roomId && isAuthenticated) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [roomId, isAuthenticated]);

  return {
    socket,
    status,
    isConnected: status === 'connected',
    pingLatency,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage
  };
}
