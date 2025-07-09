import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GameProvider } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import GameBoard from '@/components/game/GameBoard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// =============================================================================
// GAME PAGE COMPONENT
// =============================================================================
export default function GamePage() {
  const router = useRouter();
  const { gameId } = router.query;
  const { user, isAuthenticated, getToken } = useAuth();
  const { isConnected, connect, disconnect, sendMessage } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedGameState, setHasRequestedGameState] = useState(false);

  // =============================================================================
  // AUTHENTICATION CHECK
  // =============================================================================
  useEffect(() => {
    if (!router.isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!gameId || typeof gameId !== 'string') {
      setError('ID do jogo inválido');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [router.isReady, isAuthenticated, gameId, router]);

  // =============================================================================
  // WEBSOCKET CONNECTION - CONEXÃO PARA O JOGO (CORRIGIDA)
  // =============================================================================
  useEffect(() => {
    if (!router.isReady || !isAuthenticated || !gameId || typeof gameId !== 'string') return;

    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // ✅ IMPORTANTE: A URL agora é do JOGO, não mais da SALA
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${gameId}?token=${encodeURIComponent(token)}`;

    // Conecta se não estiver conectado
    if (!isConnected) {
      console.log('🔌 Connecting to game WebSocket:', wsUrl);
      connect(wsUrl);
    }

    // Cleanup na desmontagem do componente
    return () => {
      if (isConnected) {
        console.log('🔌 Disconnecting from game WebSocket');
        disconnect();
      }
    };
  }, [router.isReady, gameId, isAuthenticated, isConnected, connect, disconnect, getToken, router]);

  // =============================================================================
  // REQUEST INITIAL GAME STATE (CORRIGIDO)
  // =============================================================================
  useEffect(() => {
    if (!isConnected || !gameId || hasRequestedGameState) return;

    // ✅ Assim que estiver conectado, pede o estado do jogo
    console.log(`🚀 Requesting initial game state for game: ${gameId}`);

    const success = sendMessage('get-game-state', { gameId });
    if (success) {
      setHasRequestedGameState(true);
    }
  }, [isConnected, gameId, hasRequestedGameState, sendMessage]);

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  const handleBackToLobby = () => {
    // Desconecta antes de voltar ao lobby
    if (isConnected) {
      disconnect();
    }
    router.push('/lobby');
  };

  const handleRetry = () => {
    setError(null);
    setHasRequestedGameState(false);

    if (gameId && user) {
      const token = getToken();
      if (token) {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${gameId}?token=${encodeURIComponent(token)}`;
        connect(wsUrl);
      }
    }
  };

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-gray-300 mt-4">Carregando jogo...</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // ERROR STATE
  // =============================================================================
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Erro ao Carregar Jogo</h1>
          <p className="text-gray-300 mb-6">{error}</p>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>

            <button
              onClick={handleBackToLobby}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Voltar ao Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // CONNECTION STATE
  // =============================================================================
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="text-yellow-400 text-6xl mb-4">🌙</div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Conectando ao Jogo</h2>
          <p className="text-gray-300">Estabelecendo conexão...</p>

          <button
            onClick={handleBackToLobby}
            className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // =============================================================================
  // MAIN GAME RENDER
  // =============================================================================
  return (
    <ErrorBoundary>
      <GameProvider gameId={gameId as string}>
        <div className="min-h-screen bg-gray-900">
          {/* Game Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-white">
                  🐺 Lobisomem Online
                </h1>
                <div className="text-sm text-gray-400">
                  Jogo: {gameId}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-gray-400">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {/* User Info */}
                {user && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      👤
                    </div>
                    <span className="text-sm text-white">{user.username}</span>
                  </div>
                )}

                {/* Back Button */}
                <button
                  onClick={handleBackToLobby}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  ← Lobby
                </button>
              </div>
            </div>
          </div>

          {/* Game Board */}
          <GameBoard />
        </div>
      </GameProvider>
    </ErrorBoundary>
  );
}