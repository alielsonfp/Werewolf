import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import TimerDisplay from './TimerDisplay';
import RoleCard from './RoleCard';
import PlayerCircle from './PlayerCircle';
import ChatGigante from './ChatGigante';
import PlayerList from './PlayerList';
import ActionPanel from './ActionPanel';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// ✅✅✅ MODAL FECHÁVEL: Componente com Estado Local ✅✅✅
const DeadPlayerOverlay = () => {
  const [isVisible, setIsVisible] = useState(true);

  // Se foi fechado, não renderiza nada (jogador pode assistir livremente)
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40">
      <div className="bg-red-900 border-2 border-red-600 rounded-lg p-8 max-w-md mx-4 text-center relative">

        {/* Botão X no canto superior direito */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 text-white/70 hover:text-white text-2xl font-bold transition-colors duration-200"
          title="Fechar e continuar assistindo"
        >
          ×
        </button>

        <div className="text-6xl mb-4">💀</div>
        <h2 className="text-2xl font-bold text-white mb-4">Você Morreu!</h2>
        <p className="text-white/80 mb-6">
          Agora você é um espectador. Continue assistindo o jogo até o final.
        </p>
        <div className="text-amber-400 animate-pulse mb-6">
          👻 Modo Espectador Ativo
        </div>

        {/* Botão principal para fechar */}
        <button
          onClick={() => setIsVisible(false)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded transition-colors duration-200"
        >
          Continuar Assistindo
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// GAME BOARD COMPONENT - LAYOUT TOWN OF SALEM (SEM PHASE INDICATOR E WILL NOTES)
// =============================================================================
export default function GameBoard() {
  const { gameState, isLoading, error, me, connectionStatus } = useGame();

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (isLoading || connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" />
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
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Erro no Jogo</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-medieval-600 hover:bg-medieval-500 text-white px-4 py-2 rounded"
          >
            Recarregar Página
          </button>
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
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-xl font-bold text-white mb-2">Jogo não encontrado</h2>
          <p className="text-white/70 mb-4">O estado do jogo não foi carregado.</p>
          <button
            onClick={() => window.location.href = '/lobby'}
            className="bg-medieval-600 hover:bg-medieval-500 text-white px-4 py-2 rounded"
          >
            Voltar ao Lobby
          </button>
        </div>
      </div>
    );
  }

  // =============================================================================
  // WAITING FOR PLAYERS
  // =============================================================================
  if (gameState.status === 'WAITING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medieval-900 via-medieval-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-white mb-4">Aguardando Jogadores</h2>

          <div className="bg-medieval-800/50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-white">{gameState.players?.length || 0}</div>
                <div className="text-sm text-white/70">Jogadores</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{gameState.spectators?.length || 0}</div>
                <div className="text-sm text-white/70">Espectadores</div>
              </div>
            </div>

            <div className="space-y-2">
              {gameState.players?.map((player: any) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-medieval-700 rounded">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-white text-sm">{player.username}</span>
                    {player.isHost && <span className="text-amber-400 text-xs">👑</span>}
                    {player.isReady && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-amber-400">
            <div className="animate-bounce">⌛</div>
            <p className="text-sm">Aguardando início...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Detectar se jogador é espectador
  const isSpectator = me && !me.isAlive;
  const isGameActive = gameState && gameState.status === 'PLAYING';

  // =============================================================================
  // DETERMINE BACKGROUND BASED ON PHASE
  // =============================================================================
  const getBackgroundClass = () => {
    if (gameState.phase === 'NIGHT') {
      return 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950';
    }
    return 'bg-gradient-to-br from-medieval-900 via-medieval-800 to-black';
  };

  // =============================================================================
  // MAIN GAME LAYOUT - TOWN OF SALEM STYLE (MODIFICADO)
  // =============================================================================
  return (
    <div className={`h-screen transition-all duration-1000 ${getBackgroundClass()}`}>

      {/* ✅✅✅ OVERLAY DE MORTE FECHÁVEL ✅✅✅ */}
      {isSpectator && isGameActive && <DeadPlayerOverlay />}

      {/* Top Header Bar - SEM PHASE INDICATOR E SEM TÍTULO */}
      <header className="h-16 bg-medieval-800/50 border-b border-medieval-600 flex items-center justify-between px-4">
        {/* Left: Espaço vazio onde estava o PhaseIndicator */}
        <div className="w-32"></div>

        {/* Center: Espaço vazio onde estava o título */}
        <div className="w-32"></div>

        {/* Right: Timer */}
        <TimerDisplay />
      </header>

      {/* Main Game Grid - LAYOUT ORIGINAL RESTAURADO */}
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

        {/* Center Column - Bottom: APENAS Action Panel (sem WillNotes) */}
        <section className="col-span-6 row-span-1">
          <ActionPanel />
        </section>

      </main>

      {/* Game Over Overlay */}
      {gameState.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-medieval-800 border-2 border-medieval-600 rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {gameState.winningFaction === 'TOWN' ? '🏘️' :
                  gameState.winningFaction === 'WEREWOLF' ? '🐺' :
                    gameState.winningFaction === 'NEUTRAL' ? '🎭' : '⚡'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {gameState.winningFaction === 'TOWN' ? 'Cidade Venceu!' :
                  gameState.winningFaction === 'WEREWOLF' ? 'Lobisomens Venceram!' :
                    gameState.winningFaction === 'NEUTRAL' ? 'Neutros Venceram!' : 'Jogo Encerrado!'}
              </h2>
              <p className="text-white/70 mb-6">
                O jogo terminou!
              </p>

              {/* Mostrar jogadores vencedores se existirem */}
              {gameState.winningPlayers && gameState.winningPlayers.length > 0 && (
                <div className="mb-4">
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
                className="bg-medieval-600 hover:bg-medieval-500 text-white px-6 py-2 rounded"
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