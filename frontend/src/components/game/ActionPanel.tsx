import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';

// =============================================================================
// ACTION PANEL COMPONENT - AÇÕES DO JOGADOR POR FASE
// =============================================================================
export default function ActionPanel() {
  const { gameState, me, alivePlayers, canVote, canAct } = useGame();
  const { sendMessage } = useSocket();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  if (!gameState || !me) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-white/50">Carregando ações...</div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================
  const handleNightAction = () => {
    if (!selectedTarget || !me.role) return;

    const actionType = me.role === 'SHERIFF' ? 'INVESTIGATE' :
      me.role === 'DOCTOR' ? 'PROTECT' :
        me.role === 'VIGILANTE' ? 'SHOOT' :
          me.role === 'WEREWOLF' ? 'KILL' :
            me.role === 'WEREWOLF_KING' ? 'KILL' : null;

    if (actionType) {
      sendMessage('game-action', {
        type: actionType,
        targetId: selectedTarget,
      });

      setSelectedTarget(null);
      setConfirmingAction(false);
    }
  };

  const handleVote = () => {
    if (!selectedTarget) return;

    sendMessage('vote', { targetId: selectedTarget });
    setSelectedTarget(null);
  };

  const handleUnvote = () => {
    sendMessage('unvote', {});
  };

  // =============================================================================
  // GET VALID TARGETS
  // =============================================================================
  const getValidTargets = () => {
    if (gameState.phase === 'VOTING') {
      return alivePlayers.filter(p => p.id !== me.id); // Can't vote for yourself
    }

    if (gameState.phase === 'NIGHT' && me.role) {
      switch (me.role) {
        case 'SHERIFF':
        case 'VIGILANTE':
          return alivePlayers.filter(p => p.id !== me.id);
        case 'DOCTOR':
          return alivePlayers; // Doctor can protect themselves
        case 'WEREWOLF':
        case 'WEREWOLF_KING':
          return alivePlayers.filter(p => p.faction !== 'WEREWOLF'); // Can't kill other werewolves
        default:
          return [];
      }
    }

    return [];
  };

  const validTargets = getValidTargets();

  // =============================================================================
  // GET ACTION INFO
  // =============================================================================
  const getActionInfo = () => {
    if (gameState.phase === 'VOTING') {
      return {
        title: '🗳️ Votação',
        description: 'Escolha quem deve ser executado pela vila',
        actionText: 'Votar',
        canAct: canVote,
      };
    }

    if (gameState.phase === 'NIGHT' && me.role) {
      switch (me.role) {
        case 'SHERIFF':
          return {
            title: '🔍 Investigação',
            description: 'Investigue um jogador para descobrir se é suspeito',
            actionText: 'Investigar',
            canAct: canAct,
          };
        case 'DOCTOR':
          return {
            title: '⚕️ Proteção',
            description: 'Proteja um jogador de ataques noturnos',
            actionText: 'Proteger',
            canAct: canAct,
          };
        case 'VIGILANTE':
          return {
            title: '🔫 Vigilância',
            description: 'Elimine um suspeito (cuidado com inocentes!)',
            actionText: 'Atirar',
            canAct: canAct,
          };
        case 'WEREWOLF':
        case 'WEREWOLF_KING':
          return {
            title: '🐺 Ataque',
            description: 'Escolha quem atacar durante a noite',
            actionText: 'Atacar',
            canAct: canAct,
          };
        default:
          return null;
      }
    }

    return null;
  };

  const actionInfo = getActionInfo();

  // =============================================================================
  // RENDER DIFFERENT STATES
  // =============================================================================

  // Dead player
  if (!me.isAlive) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">👻</div>
          <h3 className="text-lg font-semibold text-white mb-2">Você está morto</h3>
          <p className="text-white/70">Observe em silêncio e torça pelo seu time!</p>
        </div>
      </div>
    );
  }

  // Day phase (no actions)
  if (gameState.phase === 'DAY') {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">☀️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Discussão do Dia</h3>
          <p className="text-white/70">Use o chat para discutir e investigar!</p>
          <p className="text-amber-400 text-sm mt-2">
            A votação começará em breve...
          </p>
        </div>
      </div>
    );
  }

  // No valid actions
  if (!actionInfo) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">😴</div>
          <h3 className="text-lg font-semibold text-white mb-2">Sem Ações</h3>
          <p className="text-white/70">Você não possui ações disponíveis nesta fase.</p>
        </div>
      </div>
    );
  }

  // Already acted
  if (!actionInfo.canAct && gameState.phase === 'NIGHT') {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-white mb-2">Ação Realizada</h3>
          <p className="text-white/70">Você já realizou sua ação nesta noite.</p>
          <p className="text-amber-400 text-sm mt-2">
            Aguardando outros jogadores...
          </p>
        </div>
      </div>
    );
  }

  // Already voted
  if (!actionInfo.canAct && gameState.phase === 'VOTING') {
    const myVote = gameState.votes && gameState.votes[me.userId];
    const votedPlayer = myVote ? alivePlayers.find(p => p.id === myVote) : null;

    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">🗳️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Voto Registrado</h3>
          {votedPlayer && (
            <p className="text-white/70 mb-4">
              Você votou em: <span className="text-amber-400 font-semibold">{votedPlayer.username}</span>
            </p>
          )}

          <button
            onClick={handleUnvote}
            className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all duration-200"
          >
            Remover Voto
          </button>
        </div>
      </div>
    );
  }

  // Main action interface
  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-4">
        <h3 className="text-lg font-bold text-white mb-2">{actionInfo.title}</h3>
        <p className="text-white/70 text-sm">{actionInfo.description}</p>
      </div>

      {/* Target Selection */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-white font-semibold mb-3">Escolha um alvo:</h4>

        <div className="space-y-2">
          {validTargets.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedTarget(player.id)}
              className={`
                w-full p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedTarget === player.id
                  ? 'border-amber-400 bg-amber-900/30'
                  : 'border-medieval-600 bg-medieval-700/30 hover:border-amber-400/50 hover:bg-medieval-700/50'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-medieval-600 flex items-center justify-center">
                  {player.isHost ? '👑' : player.userId === me.userId ? '👤' : '🧑'}
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium">{player.username}</div>
                  <div className="text-white/50 text-sm">
                    {player.isHost && 'Host • '}
                    {player.isConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                </div>

                {selectedTarget === player.id && (
                  <div className="text-amber-400 text-xl">👈</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {validTargets.length === 0 && (
          <div className="text-center text-white/50 py-8">
            <div className="text-4xl mb-2">🚫</div>
            <p>Nenhum alvo válido disponível</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      {validTargets.length > 0 && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-4">
          {!confirmingAction ? (
            <button
              onClick={() => setConfirmingAction(true)}
              disabled={!selectedTarget}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {selectedTarget
                ? `${actionInfo.actionText} ${validTargets.find(p => p.id === selectedTarget)?.username}`
                : 'Selecione um alvo'
              }
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-amber-400 font-semibold">
                ⚠️ Confirmar ação?
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={gameState.phase === 'VOTING' ? handleVote : handleNightAction}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  ✓ Confirmar
                </button>

                <button
                  onClick={() => {
                    setConfirmingAction(false);
                    setSelectedTarget(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  ✗ Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}