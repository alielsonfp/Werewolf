import React from 'react';
import { useGame } from '@/context/GameContext';
import PhaseIndicator from './PhaseIndicator';
import TimerDisplay from './TimerDisplay';
import RoleCard from './RoleCard';
import PlayerCircle from './PlayerCircle';
import ChatGigante from './ChatGigante';
import PlayerList from './PlayerList';
import ActionPanel from './ActionPanel';
import WillNotes from './WillNotes';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// GAME BOARD COMPONENT - LAYOUT TOWN OF SALEM
// =============================================================================
export default function GameBoard() {
  const { gameState, isLoading, error, me } = useGame();

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-white/70 mt-4">Carregando estado do jogo...</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // ERROR STATE
  // =============================================================================
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">💀</div>
          <h2 className="text-xl font-bold text-white mb-4">Erro no Jogo</h2>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // NO GAME STATE
  // =============================================================================
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="text-amber-400 text-6xl mb-4">🌙</div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Aguardando Jogo</h2>
          <p className="text-white/70">Conectando ao servidor...</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // LOBBY STATE
  // =============================================================================
  if (gameState.phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-6xl mb-6">🏰</div>
          <h2 className="text-3xl font-bold text-white mb-4">Sala de Espera</h2>
          <p className="text-white/70 mb-6">
            Aguardando outros jogadores se juntarem...
          </p>

          <div className="bg-medieval-800/30 border border-medieval-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Jogadores ({gameState.players.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center space-x-2 p-2 bg-medieval-800/50 border border-medieval-600 rounded"
                >
                  <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-white text-sm">{player.username}</span>
                  {player.isHost && <span className="text-amber-400 text-xs">👑</span>}
                  {player.isReady && <span className="text-green-400 text-xs">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // MAIN GAME LAYOUT - TOWN OF SALEM STYLE
  // =============================================================================
  return (
    <div className="h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black">
      {/* Top Header Bar */}
      <header className="h-16 bg-medieval-800/50 border-b border-medieval-600 flex items-center justify-between px-4">
        {/* Left: Phase & Day */}
        <PhaseIndicator />

        {/* Center: Game Title */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🐺</span>
          <h1 className="text-xl font-bold text-white">Lobisomem Online</h1>
        </div>

        {/* Right: Timer */}
        <TimerDisplay />
      </header>

      {/* Main Game Grid - 6 Sections Layout */}
      <main className="h-[calc(100vh-4rem)] grid grid-cols-12 grid-rows-2 gap-4 p-4">

        {/* Left Column - Top: Role Card */}
        <section className="col-span-3 row-span-1">
          <RoleCard />
        </section>

        {/* Center Column - Top: Game Area with Players Circle */}
        <section className="col-span-6 row-span-1">
          <PlayerCircle />
        </section>

        {/* Right Column - Full Height: Chat Gigante */}
        <section className="col-span-3 row-span-2">
          <ChatGigante />
        </section>

        {/* Left Column - Bottom: Player List */}
        <section className="col-span-3 row-span-1">
          <PlayerList />
        </section>

        {/* Center Column - Bottom: Action Panel & Will Notes */}
        <section className="col-span-6 row-span-1 grid grid-cols-2 gap-4">
          <ActionPanel />
          <WillNotes />
        </section>

      </main>

      {/* Game Over Overlay */}
      {gameState.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-medieval-800 border-2 border-medieval-600 rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {gameState.winningFaction === 'TOWN' ? '🏘️' :
                  gameState.winningFaction === 'WEREWOLF' ? '🐺' : '⚡'}
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">
                Fim de Jogo!
              </h2>

              <p className="text-white/70 mb-6">
                {gameState.winningFaction === 'TOWN' && 'A Vila Venceu!'}
                {gameState.winningFaction === 'WEREWOLF' && 'Os Lobisomens Venceram!'}
                {gameState.winningFaction === 'NEUTRAL' && 'Neutros Venceram!'}
                {!gameState.winningFaction && 'Jogo Encerrado'}
              </p>

              {gameState.winningPlayers && gameState.winningPlayers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Vencedores:</h3>
                  <div className="space-y-1">
                    {gameState.winningPlayers.map((playerId) => {
                      const player = gameState.players.find(p => p.id === playerId);
                      return player ? (
                        <div key={playerId} className="text-amber-400">
                          {player.username} ({player.role})
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => window.location.href = '/lobby'}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Voltar ao Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}