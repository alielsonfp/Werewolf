import React from 'react';
import { useGame } from '@/context/GameContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// PLAYER LIST COMPONENT - LISTA LATERAL COMPACTA
// =============================================================================
export default function PlayerList() {
  const { gameState, me } = useGame();

  if (!gameState) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner text="Carregando lista..." />
        </div>
      </div>
    );
  }

  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);
  const deadPlayers = gameState.players.filter(p => !p.isAlive && !p.isSpectator);
  const spectators = gameState.players.filter(p => p.isSpectator) || [];

  // =============================================================================
  // PLAYER ROW COMPONENT
  // =============================================================================
  const PlayerRow = ({ player, isDead = false }: { player: any; isDead?: boolean }) => {
    const isMe = me?.userId === player.userId;
    const hasVoted = gameState.votes && Object.keys(gameState.votes).includes(player.userId);
    const votesReceived = gameState.votes
      ? Object.values(gameState.votes).filter(targetId => targetId === player.id).length
      : 0;

    return (
      <div className={`
        flex items-center space-x-2 p-2 rounded-lg transition-all duration-200
        ${isMe
          ? 'bg-blue-900/50 border border-blue-600'
          : isDead
            ? 'bg-gray-800/30 border border-gray-600 opacity-75'
            : 'bg-medieval-700/30 border border-medieval-600 hover:bg-medieval-700/50'
        }
      `}>

        {/* Status Indicators */}
        <div className="flex flex-col items-center space-y-1">
          {/* Connection Status */}
          <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />

          {/* Vote Count */}
          {votesReceived > 0 && gameState.phase === 'VOTING' && (
            <div className="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {votesReceived}
            </div>
          )}
        </div>

        {/* Player Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-lg
          ${isDead ? 'bg-gray-700' : isMe ? 'bg-blue-800' : 'bg-medieval-600'}
        `}>
          {player.avatar ? (
            <img src={player.avatar} alt={player.username} className="w-full h-full rounded-full" />
          ) : (
            isDead ? '💀' : player.isHost ? '👑' : isMe ? '👤' : '🧑'
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${isDead ? 'text-gray-400' : isMe ? 'text-blue-300' : 'text-white'}`}>
            {player.username}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1">
            {isMe && (
              <span className="bg-blue-600 text-white text-xs px-1 rounded">Você</span>
            )}
            {player.isHost && (
              <span className="bg-amber-600 text-white text-xs px-1 rounded">Host</span>
            )}
            {player.isReady && gameState.phase === 'LOBBY' && (
              <span className="bg-green-600 text-white text-xs px-1 rounded">Pronto</span>
            )}
            {hasVoted && gameState.phase === 'VOTING' && (
              <span className="bg-green-600 text-white text-xs px-1 rounded">Votou</span>
            )}
            {player.hasActed && gameState.phase === 'NIGHT' && (
              <span className="bg-blue-600 text-white text-xs px-1 rounded">Agiu</span>
            )}
            {player.isProtected && (
              <span className="bg-purple-600 text-white text-xs px-1 rounded">🛡️</span>
            )}
          </div>

          {/* Role (only shown if dead or if it's me) */}
          {((isDead && player.role) || (isMe && player.role)) && (
            <div className="text-xs text-purple-300 mt-1">
              {player.role}
            </div>
          )}
        </div>

        {/* Action Indicators */}
        <div className="flex flex-col items-center space-y-1">
          {/* Has Voted */}
          {hasVoted && gameState.phase === 'VOTING' && (
            <div className="text-green-400 text-sm">✓</div>
          )}

          {/* Host Crown */}
          {player.isHost && (
            <div className="text-amber-400 text-sm">👑</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>👥</span>
            <span>Jogadores</span>
          </h3>

          <div className="text-xs text-white/70">
            {alivePlayers.length + deadPlayers.length} total
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-4 mt-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-400">Vivos: {alivePlayers.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-400">Mortos: {deadPlayers.length}</span>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">

        {/* Living Players */}
        {alivePlayers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center space-x-1">
              <span>💚</span>
              <span>Vivos ({alivePlayers.length})</span>
            </h4>
            <div className="space-y-1">
              {alivePlayers.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </div>
          </div>
        )}

        {/* Dead Players */}
        {deadPlayers.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center space-x-1">
              <span>💀</span>
              <span>Mortos ({deadPlayers.length})</span>
            </h4>
            <div className="space-y-1">
              {deadPlayers.map((player) => (
                <PlayerRow key={player.id} player={player} isDead={true} />
              ))}
            </div>
          </div>
        )}

        {/* Spectators */}
        {spectators.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center space-x-1">
              <span>👁️</span>
              <span>Espectadores ({spectators.length})</span>
            </h4>
            <div className="space-y-1">
              {spectators.map((spectator) => (
                <div
                  key={spectator.id}
                  className="flex items-center space-x-2 p-2 bg-blue-900/20 border border-blue-600 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-lg">
                    👁️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-blue-300 truncate">{spectator.username}</div>
                    <div className="text-xs text-blue-400">Espectador</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vote Summary (during voting phase) */}
      {gameState.phase === 'VOTING' && gameState.votes && Object.keys(gameState.votes).length > 0 && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-4">
          <h4 className="text-sm font-semibold text-white mb-2">🗳️ Resumo dos Votos</h4>

          <div className="space-y-1">
            {Object.entries(
              Object.entries(gameState.votes).reduce((acc, [voterId, targetId]) => {
                const target = alivePlayers.find(p => p.id === targetId);
                if (target) {
                  acc[targetId] = (acc[targetId] || 0) + 1;
                }
                return acc;
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a) // Sort by vote count
              .map(([playerId, voteCount]) => {
                const player = alivePlayers.find(p => p.id === playerId);
                return player ? (
                  <div key={playerId} className="flex justify-between items-center text-sm">
                    <span className="text-white truncate">{player.username}</span>
                    <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">
                      {voteCount} {voteCount === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alivePlayers.length === 0 && deadPlayers.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/50">
            <div className="text-4xl mb-2">👻</div>
            <p>Nenhum jogador</p>
          </div>
        </div>
      )}
    </div>
  );
}