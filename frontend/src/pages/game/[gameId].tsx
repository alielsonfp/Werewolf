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
  const { user, isAuthenticated } = useAuth();
  const { isConnected, connect, sendMessage } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoinedGame, setHasJoinedGame] = useState(false);

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
  // WEBSOCKET CONNECTION
  // =============================================================================
  useEffect(() => {
    if (!gameId || !user || isLoading) return;

    // Build WebSocket URL for this specific game
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${gameId}?token=${localStorage.getItem('token')}`;

    if (!isConnected) {
      console.log('🔌 Connecting to game WebSocket:', wsUrl);
      connect(wsUrl);
    }
  }, [gameId, user, isLoading, isConnected, connect]);

  // =============================================================================
  // JOIN GAME
  // =============================================================================
  useEffect(() => {
    if (!isConnected || !gameId || hasJoinedGame || !user) return;

    // Send join-game message to backend
    const success = sendMessage('join-game', {
      gameId: gameId as string,
      asSpectator: false,
    });

    if (success) {
      console.log('🎮 Sent join-game message for:', gameId);
      setHasJoinedGame(true);
    } else {
      setError('Falha ao conectar com o jogo');
    }
  }, [isConnected, gameId, hasJoinedGame, user, sendMessage]);

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  const handleRetry = () => {
    setError(null);
    setHasJoinedGame(false);

    if (gameId && user) {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${gameId}?token=${localStorage.getItem('token')}`;
      connect(wsUrl);
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