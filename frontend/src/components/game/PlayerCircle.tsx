import React from 'react';
import { useGame } from '@/context/GameContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// PLAYER CIRCLE COMPONENT - PLAYERS AO REDOR DA FORCA (SEM CEMITÉRIO)
// =============================================================================
export default function PlayerCircle() {
  const { gameState, me } = useGame();

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState) {
    return (
      <div className="w-full h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex items-center justify-center">
        <LoadingSpinner text="Carregando jogadores..." />
      </div>
    );
  }

  // =============================================================================
  // FILTER PLAYERS - APENAS JOGADORES VIVOS
  // =============================================================================
  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);

  // =============================================================================
  // CALCULATE PLAYER POSITIONS IN CIRCLE
  // =============================================================================
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const angle = (index * 360) / totalPlayers - 90; // Start from top
    const radiusX = 35; // Horizontal radius percentage
    const radiusY = 30; // Vertical radius percentage

    const x = 50 + radiusX * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radiusY * Math.sin((angle * Math.PI) / 180);

    return { x, y };
  };

  return (
    <div className="w-full h-full bg-medieval-800/30 border border-medieval-600 rounded-lg relative overflow-hidden">

      {/* Background - Town Square */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-medieval-900/50" />

      {/* Center - Gallows/Forca */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="text-center">
          {/* Forca Visual */}
          <div className="text-6xl mb-2 filter drop-shadow-lg">
            🪓
          </div>
          <div className="text-amber-400 text-xs font-semibold">
            FORCA
          </div>
        </div>
      </div>

      {/* Living Players Circle */}
      {alivePlayers.map((player, index) => {
        const position = getPlayerPosition(index, alivePlayers.length);
        const isMe = me?.userId === player.userId;
        const hasVoted = gameState.votes && Object.keys(gameState.votes).includes(player.userId);
        const votesReceived = gameState.votes
          ? Object.values(gameState.votes).filter(targetId => targetId === player.id).length
          : 0;

        return (
          <div
            key={player.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            {/* Player Avatar */}
            <div className={`
              w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg
              transition-all duration-200 group-hover:scale-110
              ${isMe
                ? 'border-blue-400 bg-blue-900/70 text-blue-200'
                : hasVoted
                  ? 'border-green-400 bg-green-900/70 text-green-200'
                  : 'border-medieval-300 bg-medieval-700/70 text-white'
              }
              ${votesReceived > 0 ? 'ring-2 ring-red-400 ring-opacity-75' : ''}
            `}>
              {player.username?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Vote Count Indicator */}
            {votesReceived > 0 && gameState.phase === 'VOTING' && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {votesReceived}
              </div>
            )}

            {/* Voted Indicator */}
            {hasVoted && gameState.phase === 'VOTING' && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-600 text-white text-xs px-1 rounded-full">
                  ✓
                </div>
              </div>
            )}

            {/* Player Name Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className={`
                px-2 py-1 rounded text-xs whitespace-nowrap font-medium border
                ${isMe
                  ? 'text-blue-300 bg-blue-900/80 border-blue-600'
                  : 'text-white bg-medieval-800/80 border-medieval-600'
                }
              `}>
                {player.username}
              </div>

              {/* Role indicator (only for me or if dead) */}
              {isMe && player.role && (
                <div className="text-xs text-purple-300 mt-1 text-center">
                  {player.role}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Phase Information Overlay */}
      <div className="absolute top-4 left-4 bg-medieval-800/80 border border-medieval-600 rounded-lg px-3 py-2">
        <div className="text-white text-sm">
          {gameState.phase === 'NIGHT' && (
            <div className="flex items-center space-x-2">
              <span>🌙</span>
              <span>Ações secretas em andamento...</span>
            </div>
          )}
          {gameState.phase === 'DAY' && (
            <div className="flex items-center space-x-2">
              <span>☀️</span>
              <span>Discutam e investiguem!</span>
            </div>
          )}
          {gameState.phase === 'VOTING' && (
            <div className="flex items-center space-x-2">
              <span>🗳️</span>
              <span>Votem para executar!</span>
            </div>
          )}
        </div>
      </div>

      {/* Empty State - quando não há jogadores vivos */}
      {alivePlayers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👻</div>
            <h3 className="text-lg font-semibold text-white mb-2">Cidade Vazia</h3>
            <p className="text-white/70">Todos os jogadores foram eliminados...</p>
          </div>
        </div>
      )}

      {/* Players Count Info - canto inferior direito */}
      <div className="absolute bottom-4 right-4 bg-medieval-800/80 border border-medieval-600 rounded-lg px-3 py-2">
        <div className="text-white text-sm">
          <div className="flex items-center space-x-2">
            <span>👥</span>
            <span>{alivePlayers.length} vivos</span>
          </div>
        </div>
      </div>
    </div>
  );
}