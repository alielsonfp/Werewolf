import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';

// =============================================================================
// TIMER DISPLAY COMPONENT - COMPACTO PARA HEADER
// =============================================================================
export default function TimerDisplay() {
  const { gameState } = useGame();
  const [localTimeLeft, setLocalTimeLeft] = useState(0);

  // =============================================================================
  // SYNC WITH GAME STATE
  // =============================================================================
  useEffect(() => {
    if (!gameState) return;

    const newTimeLeft = gameState.timeLeft || 0;
    setLocalTimeLeft(newTimeLeft);
  }, [gameState?.timeLeft, gameState?.phase]);

  // =============================================================================
  // LOCAL COUNTDOWN UPDATE
  // =============================================================================
  useEffect(() => {
    if (localTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setLocalTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [localTimeLeft]);

  // =============================================================================
  // NO GAME STATE
  // =============================================================================
  if (!gameState) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-medieval-700 h-10 w-20 rounded-lg"></div>
      </div>
    );
  }

  // =============================================================================
  // CALCULATE DISPLAY VALUES
  // =============================================================================
  const totalSeconds = Math.floor(localTimeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Determine urgency level
  const isUrgent = totalSeconds <= 30;
  const isCritical = totalSeconds <= 10;
  const isEmpty = totalSeconds <= 0;

  // Color scheme based on time remaining
  const getTimerColor = () => {
    if (isEmpty) return 'text-gray-500';
    if (isCritical) return 'text-red-400';
    if (isUrgent) return 'text-amber-400';
    return 'text-green-400';
  };

  const getBorderColor = () => {
    if (isEmpty) return 'border-gray-600';
    if (isCritical) return 'border-red-500';
    if (isUrgent) return 'border-amber-500';
    return 'border-green-500';
  };

  const getBackgroundColor = () => {
    if (isEmpty) return 'bg-gray-800';
    if (isCritical) return 'bg-red-900';
    if (isUrgent) return 'bg-amber-900';
    return 'bg-green-900';
  };

  // =============================================================================
  // RENDER TIMER
  // =============================================================================
  return (
    <div className="flex items-center space-x-3">

      {/* Main Timer Display - Compact */}
      <div className={`
        ${getBackgroundColor()} border-2 ${getBorderColor()} rounded-lg px-3 py-2
        ${isCritical ? 'animate-pulse' : ''}
        transition-all duration-300 flex items-center space-x-2
      `}>

        {/* Timer Icon */}
        <div className="text-lg">
          {isEmpty ? '⏰' :
            isCritical ? '🔥' :
              isUrgent ? '⚡' : '⏱️'}
        </div>

        {/* Time Display */}
        <div className="text-center">
          <div className={`text-lg font-mono font-bold ${getTimerColor()}`}>
            {isEmpty ? '--:--' : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="hidden md:block">
        {isUrgent && !isEmpty && (
          <div className="flex items-center space-x-1 text-amber-400">
            <span className="animate-bounce">⚠️</span>
            <span className="text-xs font-medium">
              {isCritical ? 'CRÍTICO!' : 'Tempo Acabando!'}
            </span>
          </div>
        )}

        {isEmpty && (
          <div className="flex items-center space-x-1 text-gray-400">
            <span>⏳</span>
            <span className="text-xs">
              Aguardando...
            </span>
          </div>
        )}

        {!isUrgent && !isEmpty && (
          <div className="text-xs text-white/50">
            Tempo restante
          </div>
        )}
      </div>
    </div>
  );
}