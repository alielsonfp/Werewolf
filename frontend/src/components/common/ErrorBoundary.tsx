'use client';

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import Button from './Button';

// =============================================================================
// ERROR BOUNDARY TYPES
// =============================================================================
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <DefaultErrorUI
        error={this.state.error}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
      />;
    }

    return this.props.children;
  }
}

// =============================================================================
// DEFAULT ERROR UI
// =============================================================================
interface DefaultErrorUIProps {
  error: Error | null;
  onRetry: () => void;
  onGoHome: () => void;
}

function DefaultErrorUI({ error, onRetry, onGoHome }: DefaultErrorUIProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medieval-900 to-red-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Error icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="text-8xl mb-6"
        >
          💀
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-medieval text-red-300 mb-4 text-glow">
          Algo deu errado!
        </h1>

        {/* Description */}
        <p className="text-white/70 mb-6 leading-relaxed">
          A vila foi atacada por um erro inesperado.
          Não se preocupe, podemos tentar novamente.
        </p>

        {/* Error message in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-black/30 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
              <span className="text-red-400 font-semibold text-sm">
                Erro de Desenvolvimento
              </span>
            </div>
            <pre className="text-red-300 text-xs overflow-auto max-h-32">
              {error.message}
            </pre>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            variant="medieval"
            size="lg"
            onClick={onRetry}
            className="w-full"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Tentar Novamente
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onGoHome}
            className="w-full"
          >
            <Home className="w-5 h-5 mr-2" />
            Voltar ao Início
          </Button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-white/40 text-sm mt-8"
        >
          Se o problema persistir, recarregue a página
        </motion.p>
      </motion.div>
    </div>
  );
}

// =============================================================================
// HOOK FOR FUNCTIONAL COMPONENTS
// =============================================================================
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    console.error('Error captured:', error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// =============================================================================
// SPECIFIC ERROR COMPONENTS
// =============================================================================

// Network Error
export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center p-8">
      <div className="text-6xl mb-4">📡</div>
      <h3 className="text-xl font-bold text-white mb-2">
        Erro de Conexão
      </h3>
      <p className="text-white/70 mb-6">
        Não foi possível conectar com o servidor.
        Verifique sua internet e tente novamente.
      </p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Tentar Novamente
      </Button>
    </div>
  );
}

// Game Error
export function GameError({
  message,
  onRetry,
  onLeave
}: {
  message: string;
  onRetry?: () => void;
  onLeave?: () => void;
}) {
  return (
    <div className="text-center p-8">
      <div className="text-6xl mb-4">🎮</div>
      <h3 className="text-xl font-bold text-white mb-2">
        Erro no Jogo
      </h3>
      <p className="text-white/70 mb-6">
        {message}
      </p>
      <div className="space-y-3">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
        {onLeave && (
          <Button variant="ghost" onClick={onLeave} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Sair do Jogo
          </Button>
        )}
      </div>
    </div>
  );
}

// 404 Error
export function NotFoundError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medieval-900 to-medieval-800 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl mb-6">🏚️</div>
        <h1 className="text-4xl font-medieval text-white mb-4">
          404
        </h1>
        <h2 className="text-xl text-white/80 mb-6">
          Esta página foi devorada pelos lobos
        </h2>
        <p className="text-white/60 mb-8">
          A página que você procura não existe ou foi movida para outro local.
        </p>
        <Button
          variant="medieval"
          size="lg"
          onClick={() => window.location.href = '/'}
        >
          <Home className="w-5 h-5 mr-2" />
          Voltar à Vila
        </Button>
      </motion.div>
    </div>
  );
}