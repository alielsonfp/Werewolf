import React from 'react';
import { useGame } from '@/context/GameContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// PLAYER CIRCLE COMPONENT - PLAYERS AO REDOR DA FORCA
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
  // FILTER PLAYERS
  // =============================================================================
  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);
  const deadPlayers = gameState.players.filter(p => !p.isAlive && !p.isSpectator);

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
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            {/* Player Avatar Container */}
            <div className={`
              relative w-16 h-16 rounded-full border-2 transition-all duration-200
              ${isMe
                ? 'border-blue-400 bg-blue-900/80 ring-2 ring-blue-400/50'
                : 'border-medieval-600 bg-medieval-700/80 hover:border-amber-400'
              }
            `}>

              {/* Avatar */}
              <div className="w-full h-full rounded-full flex items-center justify-center text-2xl">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.username} className="w-full h-full rounded-full" />
                ) : (
                  player.isHost ? '👑' : isMe ? '👤' : '🧑'
                )}
              </div>

              {/* Connection Status Dot */}
              <div className={`
                absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-medieval-900
                ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}
              `} />

              {/* Vote Count Badge */}
              {votesReceived > 0 && gameState.phase === 'VOTING' && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs rounded-full px-2 py-1 font-bold min-w-[24px] text-center">
                  {votesReceived}
                </div>
              )}

              {/* Has Voted Indicator */}
              {hasVoted && gameState.phase === 'VOTING' && (
                <div className="absolute -top-2 -left-2 text-green-400 text-lg">
                  ✓
                </div>
              )}

              {/* Protected Shield */}
              {player.isProtected && (
                <div className="absolute -bottom-2 -right-2 text-blue-400 text-lg">
                  🛡️
                </div>
              )}

              {/* Host Crown */}
              {player.isHost && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-amber-400 text-lg">
                  👑
                </div>
              )}
            </div>

            {/* Player Name */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-center min-w-[80px]">
              <div className={`
                text-xs font-semibold truncate px-2 py-1 rounded
                ${isMe
                  ? 'text-blue-300 bg-blue-900/50'
                  : 'text-white bg-medieval-800/50'
                }
              `}>
                {player.username}
              </div>

              {/* Role indicator (only for me or if dead) */}
              {((isMe && player.role) || (!player.isAlive && player.role)) && (
                <div className="text-xs text-purple-300 mt-1">
                  {player.role}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Dead Players - Ghosts around the gallows */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-center">
            <h4 className="text-red-400 text-sm font-semibold mb-2 flex items-center justify-center space-x-1">
              <span>💀</span>
              <span>Cemitério ({deadPlayers.length})</span>
            </h4>

            <div className="flex flex-wrap justify-center gap-2">
              {deadPlayers.map((player) => (
                <div
                  key={player.id}
                  className="relative opacity-75 transform scale-75"
                >
                  <div className="w-8 h-8 rounded-full border border-gray-600 bg-gray-800/50 flex items-center justify-center">
                    <span className="text-lg">👻</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-gray-400 min-w-[40px] text-center">
                    {player.username}
                  </div>
                  {player.role && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 text-xs text-purple-400 text-center">
                      {player.role}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Empty State */}
      {alivePlayers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👻</div>
            <h3 className="text-lg font-semibold text-white mb-2">Cidade Vazia</h3>
            <p className="text-white/70">Todos os jogadores foram eliminados...</p>
          </div>
        </div>
      )}
    </div>
  );
}