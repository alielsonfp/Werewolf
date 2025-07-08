import React from 'react';
import { useGame } from '@/context/GameContext';
import type { GamePhase } from '@/types';

// =============================================================================
// PHASE CONFIGURATION
// =============================================================================
const PHASE_CONFIG = {
  LOBBY: {
    icon: '🏰',
    name: 'Sala de Espera',
    description: 'Aguardando jogadores',
    bgColor: 'bg-medieval-700',
    textColor: 'text-white/80',
    borderColor: 'border-medieval-600',
  },
  NIGHT: {
    icon: '🌙',
    name: 'Noite',
    description: 'Ações secretas',
    bgColor: 'bg-blue-900',
    textColor: 'text-blue-200',
    borderColor: 'border-blue-700',
  },
  DAY: {
    icon: '☀️',
    name: 'Dia',
    description: 'Discussão',
    bgColor: 'bg-amber-700',
    textColor: 'text-amber-200',
    borderColor: 'border-amber-600',
  },
  VOTING: {
    icon: '🗳️',
    name: 'Votação',
    description: 'Execução',
    bgColor: 'bg-red-800',
    textColor: 'text-red-200',
    borderColor: 'border-red-600',
  },
} as const;

// =============================================================================
// PHASE INDICATOR COMPONENT - COMPACTO PARA HEADER
// =============================================================================
export default function PhaseIndicator() {
  const { gameState } = useGame();

  if (!gameState) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-medieval-700 h-10 w-32 rounded-lg"></div>
      </div>
    );
  }

  const phase = gameState.phase as GamePhase;
  const config = PHASE_CONFIG[phase];
  const isNight = phase === 'NIGHT';

  return (
    <div className="flex items-center space-x-3">

      {/* Main Phase Display */}
      <div className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border-2 rounded-lg px-4 py-2 flex items-center space-x-2
        ${isNight ? 'animate-pulse' : ''}
        transition-all duration-500 min-w-0
      `}>

        {/* Phase Icon */}
        <div className="text-xl flex-shrink-0">
          {config.icon}
        </div>

        {/* Phase Info */}
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm">
              {config.name}
            </span>

            {/* Day Counter */}
            {(phase === 'DAY' || phase === 'VOTING') && gameState.day > 0 && (
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full font-medium">
                Dia {gameState.day}
              </span>
            )}
          </div>

          <p className="text-xs opacity-90">
            {config.description}
          </p>
        </div>
      </div>

      {/* Phase Progress Indicator */}
      <div className="hidden md:flex items-center space-x-2">
        <div className="w-1 h-8 bg-medieval-700 rounded-full overflow-hidden">
          <div
            className={`
              w-full transition-all duration-1000 ease-out
              ${phase === 'LOBBY' ? 'h-1/4 bg-medieval-500' : ''}
              ${phase === 'NIGHT' ? 'h-2/4 bg-blue-500' : ''}
              ${phase === 'DAY' ? 'h-3/4 bg-amber-500' : ''}
              ${phase === 'VOTING' ? 'h-full bg-red-500' : ''}
            `}
          />
        </div>

        {/* Quick Phase Info */}
        <div className="text-xs text-white/70 max-w-[120px]">
          {phase === 'LOBBY' && 'Preparando...'}
          {phase === 'NIGHT' && 'Roles agem'}
          {phase === 'DAY' && 'Discussão livre'}
          {phase === 'VOTING' && 'Escolham um alvo'}
        </div>
      </div>

      {/* Atmospheric Effects - Only on larger screens */}
      {isNight && (
        <div className="hidden lg:flex items-center space-x-1 text-blue-400">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>⭐</span>
          <span className="animate-bounce" style={{ animationDelay: '200ms' }}>✨</span>
          <span className="animate-bounce" style={{ animationDelay: '400ms' }}>🌟</span>
        </div>
      )}

      {(phase === 'DAY' || phase === 'VOTING') && (
        <div className="hidden lg:flex items-center space-x-1 text-amber-400">
          <span className="animate-pulse" style={{ animationDelay: '0ms' }}>☀️</span>
          {phase === 'VOTING' && (
            <span className="animate-pulse" style={{ animationDelay: '500ms' }}>⚖️</span>
          )}
        </div>
      )}
    </div>
  );
}