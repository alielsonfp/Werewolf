// components/lobby/ReconnectBanner.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react';

interface ReconnectBannerProps {
  isConnected?: boolean;
}

interface ActiveGame {
  gameId: string;
  roomId: string;
  roomName: string;
  phase: string;
  day: number;
  canRejoin: boolean;
  remainingSeconds: number;
}

export default function ReconnectBanner({ isConnected }: ReconnectBannerProps) {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Socket global (ajuste conforme sua implementação)
  const socket = typeof window !== 'undefined' ? (window as any).socket : null;

  useEffect(() => {
    if (!socket?.connected || !isConnected) return;

    // Verificar jogo ativo
    socket.emit('check-active-game');

    const handleActiveGameFound = (data: ActiveGame) => {
      setActiveGame(data);
      setCountdown(data.remainingSeconds);
    };

    const handleNoActiveGame = () => {
      setActiveGame(null);
      setCountdown(0);
    };

    socket.on('active-game-found', handleActiveGameFound);
    socket.on('no-active-game', handleNoActiveGame);

    const checkInterval = setInterval(() => {
      socket.emit('check-active-game');
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      socket.off('active-game-found', handleActiveGameFound);
      socket.off('no-active-game', handleNoActiveGame);
    };
  }, [socket, isConnected]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setActiveGame(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  if (!activeGame || !activeGame.canRejoin) return null;

  const handleRejoin = () => {
    router.push(`/game/${activeGame.roomId}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg p-4 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-yellow-600" />

        <div className="flex-1">
          <h3 className="font-bold text-gray-900">Jogo em Andamento!</h3>
          <p className="text-sm text-gray-600">
            {activeGame.roomName} • {activeGame.phase} {activeGame.day}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <Clock className="w-5 h-5 text-gray-500 mx-auto" />
            <span className="text-sm font-mono text-gray-700">
              {formatTime(countdown)}
            </span>
          </div>

          <button
            onClick={handleRejoin}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}