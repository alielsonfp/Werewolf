// 🐺 LOBISOMEM ONLINE - Custom Hooks
// Reusable hooks for common functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// =============================================================================
// TIPOS AUXILIARES PARA HOOKS
// =============================================================================
export interface WebSocketHookOptions {
  autoConnect?: boolean;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
  reconnectBackoff?: 'linear' | 'exponential';
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  isConnected: boolean;
  pingLatency: number;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data?: any) => boolean;
}

// =============================================================================
// ✅ WEBSOCKET HOOK COM HEARTBEAT - CORRIGIDO
// =============================================================================
export function useWebSocket(
  url: string,
  options: WebSocketHookOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    heartbeatInterval = 30000, // 30 segundos
    maxReconnectAttempts = 5,
    reconnectBackoff = 'exponential'
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingStartTimeRef = useRef<number>(0);
  const shouldReconnectRef = useRef<boolean>(true);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();

    heartbeatRef.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        pingStartTimeRef.current = Date.now();
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [socket, heartbeatInterval, clearHeartbeat]);

  const calculateReconnectDelay = useCallback((attempts: number) => {
    if (reconnectBackoff === 'linear') {
      return Math.min(1000 * attempts, 30000); // Max 30 segundos
    } else {
      return Math.min(1000 * Math.pow(2, attempts), 30000); // Exponencial, max 30 segundos
    }
  }, [reconnectBackoff]);

  const connect = useCallback(() => {
    // ✅ CORREÇÃO: Validar URL antes de conectar
    if (!url || url === '') {
      console.warn('❌ Cannot connect: URL is empty');
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected, skipping...');
      return;
    }

    setStatus('connecting');
    shouldReconnectRef.current = true;

    try {
      console.log('🔌 Connecting to WebSocket:', url);
      const ws = new WebSocket(url);
      setSocket(ws);

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        setStatus('connected');
        setReconnectAttempts(0);
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Responder ao ping com pong
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }

          // Calcular latência do ping
          if (message.type === 'pong') {
            const latency = Date.now() - pingStartTimeRef.current;
            setPingLatency(latency);
          }

          // Dispatchar evento customizado para outros componentes
          const customEvent = new CustomEvent('websocket-message', {
            detail: message
          });
          window.dispatchEvent(customEvent);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket fechado:', event.code, event.reason);
        setSocket(null);
        clearHeartbeat();

        if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
          setStatus('reconnecting');
          const delay = calculateReconnectDelay(reconnectAttempts);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else {
          setStatus('disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setStatus('error');
      };

    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setStatus('error');
    }
  }, [url, startHeartbeat, reconnectAttempts, maxReconnectAttempts, calculateReconnectDelay]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearHeartbeat();
    clearReconnectTimeout();

    if (socket) {
      socket.close();
      setSocket(null);
    }

    setStatus('disconnected');
    setReconnectAttempts(0);
  }, [socket, clearHeartbeat, clearReconnectTimeout]);

  const sendMessage = useCallback((type: string, data?: any): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type, data }));
        return true;
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return false;
      }
    }
    return false;
  }, [socket]);

  // ✅ CORREÇÃO: useEffect para autoConnect sem dependências problemáticas
  useEffect(() => {
    if (autoConnect && url && url !== '') {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, url]); // ✅ REMOVIDO: connect e disconnect das dependências para evitar loop

  return {
    socket,
    status,
    isConnected: status === 'connected',
    pingLatency,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
  };
}

// =============================================================================
// LOCAL STORAGE HOOK
// =============================================================================
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// =============================================================================
// DEBOUNCE HOOK
// =============================================================================
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// ASYNC OPERATION HOOK
// =============================================================================
export function useAsync<T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setData(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error as E);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    status,
    data,
    error,
    isLoading: status === 'pending',
    isError: status === 'error',
    isSuccess: status === 'success',
    isIdle: status === 'idle',
  };
}

// =============================================================================
// FORM HOOK
// =============================================================================
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => void | Promise<void>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const setError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setTouched = useCallback((name: keyof T, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const handleChange = useCallback((name: keyof T) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setValue(name, event.target.value);
  }, [setValue]);

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setTouched,
    handleChange,
    handleSubmit,
    reset,
    hasErrors: Object.keys(errors).length > 0,
  };
}

// =============================================================================
// COUNTDOWN HOOK
// =============================================================================
export function useCountdown(initialTime: number) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    setIsRunning(false);
    setTimeLeft(newTime ?? initialTime);
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(0);
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    isRunning,
    start,
    pause,
    reset,
    stop,
    formatTime: formatTime(timeLeft),
    isFinished: timeLeft === 0,
  };
}

// =============================================================================
// KEYBOARD HOOK
// =============================================================================
export function useKeyboard(key: string, callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === key) {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [key, callback, ...deps]);
}

// =============================================================================
// ONLINE STATUS HOOK
// =============================================================================
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return isOnline;
}

// =============================================================================
// COPY TO CLIPBOARD HOOK
// =============================================================================
export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success('Copiado para a área de transferência!');

      // Clear copied text after 3 seconds
      setTimeout(() => setCopiedText(null), 3000);

      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      toast.error('Falha ao copiar');
      setCopiedText(null);
      return false;
    }
  }, []);

  return { copy, copiedText };
}

// =============================================================================
// INTERSECTION OBSERVER HOOK
// =============================================================================
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry?.isIntersecting || false),
      options
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [elementRef, options]);

  return isIntersecting;
}

// =============================================================================
// PREVIOUS VALUE HOOK
// =============================================================================
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// =============================================================================
// WINDOW SIZE HOOK
// =============================================================================
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// =============================================================================
// ROUTE PROTECTION HOOK
// =============================================================================
export function useProtectedRoute(redirectTo = '/auth/login') {
  const router = useRouter();

  // This would typically use your auth context
  // For now, just a placeholder
  const isAuthenticated = false; // Replace with actual auth check

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, redirectTo]);

  return isAuthenticated;
}