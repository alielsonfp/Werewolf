import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// ACTION PANEL COMPONENT - VERSÃO CORRIGIDA COM LOGS DE DEBUG
// =============================================================================
export default function ActionPanel() {
  const { gameState, me, alivePlayers, canVote, canAct } = useGame();
  const { sendMessage } = useSocket();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ LOG do estado atual do painel
  React.useEffect(() => {
    console.log('🎯 ActionPanel: Current state:', {
      gamePhase: gameState?.phase,
      gameDay: gameState?.day,
      userRole: me?.role,
      userAlive: me?.isAlive,
      userHasActed: me?.hasActed,
      userHasVoted: me?.hasVoted,
      canVote,
      canAct,
      selectedTarget,
      alivePlayers: alivePlayers.length,
      timestamp: new Date().toISOString()
    });
  }, [gameState?.phase, me?.hasActed, me?.hasVoted, canVote, canAct, selectedTarget]);

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState || !me) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-4">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner text="Carregando ações..." />
        </div>
      </div>
    );
  }

  // =============================================================================
  // ✅ CORRIGIDO: ACTION HANDLERS COM LOGS DETALHADOS
  // =============================================================================
  const handleNightAction = async () => {
    if (!selectedTarget || !me.role || isSubmitting) return;

    const actionType = me.role === 'SHERIFF' ? 'INVESTIGATE' :
      me.role === 'DOCTOR' ? 'PROTECT' :
        me.role === 'VIGILANTE' ? 'SHOOT' :
          me.role === 'WEREWOLF' ? 'KILL' :
            me.role === 'WEREWOLF_KING' ? 'KILL' :
              me.role === 'SERIAL_KILLER' ? 'KILL' : null;

    if (actionType) {
      setIsSubmitting(true);

      // ✅ LOG DETALHADO: Tentativa de ação noturna
      console.log('🌙 ActionPanel: Attempting night action:', {
        actionType,
        targetId: selectedTarget,
        userRole: me.role,
        userId: me.userId,
        gamePhase: gameState.phase,
        gameId: gameState.gameId,
        timestamp: new Date().toISOString()
      });

      try {
        const success = sendMessage('game-action', {
          type: actionType,
          targetId: selectedTarget,
        });

        console.log('🌙 ActionPanel: Night action send result:', {
          success,
          actionType,
          targetId: selectedTarget
        });

        if (success) {
          console.log('✅ ActionPanel: Night action sent successfully');
        } else {
          console.error('❌ ActionPanel: Failed to send night action');
        }
      } catch (error) {
        console.error('❌ ActionPanel: Error sending night action:', error);
      }

      // Reset state after sending
      setTimeout(() => {
        setSelectedTarget(null);
        setConfirmingAction(false);
        setIsSubmitting(false);
      }, 500);
    } else {
      console.warn('⚠️ ActionPanel: No valid action type for role:', me.role);
    }
  };

  const handleVote = async () => {
    if (!selectedTarget || isSubmitting) return;

    setIsSubmitting(true);

    // ✅ LOG DETALHADO: Tentativa de voto
    console.log('🗳️ ActionPanel: Attempting vote:', {
      targetId: selectedTarget,
      userId: me.userId,
      gamePhase: gameState.phase,
      gameId: gameState.gameId,
      timestamp: new Date().toISOString()
    });

    try {
      const success = sendMessage('vote', { targetId: selectedTarget });

      console.log('🗳️ ActionPanel: Vote send result:', {
        success,
        targetId: selectedTarget
      });

      if (success) {
        console.log('✅ ActionPanel: Vote sent successfully');
      } else {
        console.error('❌ ActionPanel: Failed to send vote');
      }
    } catch (error) {
      console.error('❌ ActionPanel: Error sending vote:', error);
    }

    setTimeout(() => {
      setSelectedTarget(null);
      setIsSubmitting(false);
    }, 500);
  };

  const handleUnvote = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    // ✅ LOG DETALHADO: Tentativa de remover voto
    console.log('🗳️ ActionPanel: Attempting unvote:', {
      userId: me.userId,
      gamePhase: gameState.phase,
      timestamp: new Date().toISOString()
    });

    try {
      const success = sendMessage('unvote', {});

      console.log('🗳️ ActionPanel: Unvote send result:', { success });

      if (success) {
        console.log('✅ ActionPanel: Unvote sent successfully');
      } else {
        console.error('❌ ActionPanel: Failed to send unvote');
      }
    } catch (error) {
      console.error('❌ ActionPanel: Error sending unvote:', error);
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
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
        case 'SERIAL_KILLER':
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

  // ✅ LOG dos alvos válidos
  React.useEffect(() => {
    console.log('🎯 ActionPanel: Valid targets updated:', {
      count: validTargets.length,
      targets: validTargets.map(t => ({ id: t.id, username: t.username })),
      gamePhase: gameState?.phase,
      userRole: me?.role
    });
  }, [validTargets.length, gameState?.phase, me?.role]);

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
            description: `Elimine um suspeito (${(me.maxActions || 3) - (me.actionsUsed || 0)} balas restantes)`,
            actionText: 'Atirar',
            canAct: canAct && (me.actionsUsed || 0) < (me.maxActions || 3),
          };
        case 'WEREWOLF':
        case 'WEREWOLF_KING':
          return {
            title: '🐺 Ataque',
            description: 'Escolha quem atacar durante a noite',
            actionText: 'Atacar',
            canAct: canAct,
          };
        case 'SERIAL_KILLER':
          return {
            title: '🔪 Assassinato',
            description: 'Elimine um jogador durante a noite',
            actionText: 'Matar',
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
          {me.eliminationReason && (
            <p className="text-red-400 text-sm mt-2">
              Causa: {me.eliminationReason === 'NIGHT_KILL' ? 'Morto à noite' :
                me.eliminationReason === 'EXECUTION' ? 'Executado pela vila' :
                  me.eliminationReason === 'VIGILANTE' ? 'Morto por vigilante' :
                    'Morto por assassino'}
            </p>
          )}
          {/* ✅ DEBUG: Info do jogador morto */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-white/30">
              Debug: Role: {me.role} | Faction: {me.faction}
            </div>
          )}
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
          <h3 className="text-lg font-semibold text-white mb-2">Discussão do Dia {gameState.day}</h3>
          <p className="text-white/70">Use o chat para discutir e investigar!</p>
          <p className="text-amber-400 text-sm mt-2">
            A votação começará em breve...
          </p>
          {/* ✅ DEBUG: Info da fase do dia */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-white/30">
              Debug: Role: {me.role} | Time left: {gameState.timeLeft}ms
            </div>
          )}
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
          {/* ✅ DEBUG: Info de por que não há ações */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-white/30">
              Debug: Phase: {gameState.phase} | Role: {me.role} | Has acted: {me.hasActed}
            </div>
          )}
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
          {/* ✅ DEBUG: Info da ação já realizada */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-white/30">
              Debug: Has acted: {me.hasActed} | Actions used: {me.actionsUsed}/{me.maxActions}
            </div>
          )}
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
            disabled={isSubmitting}
            className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
          >
            {isSubmitting ? 'Removendo...' : 'Remover Voto'}
          </button>

          {/* ✅ DEBUG: Info do voto */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-white/30">
              Debug: Voted for: {myVote} | Has voted: {me.hasVoted}
            </div>
          )}
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

        {/* ✅ DEBUG: Info da ação disponível */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-white/30">
            Debug: Can act: {actionInfo.canAct} | Valid targets: {validTargets.length}
          </div>
        )}
      </div>

      {/* Target Selection */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-white font-semibold mb-3">Escolha um alvo:</h4>

        <div className="space-y-2">
          {validTargets.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                console.log('🎯 ActionPanel: Target selected:', {
                  playerId: player.id,
                  username: player.username,
                  previousTarget: selectedTarget
                });
                setSelectedTarget(player.id);
              }}
              disabled={isSubmitting}
              className={`
                w-full p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedTarget === player.id
                  ? 'border-amber-400 bg-amber-900/30'
                  : 'border-medieval-600 bg-medieval-700/30 hover:border-amber-400/50 hover:bg-medieval-700/50'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-medieval-600 flex items-center justify-center">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.username} className="w-full h-full rounded-full" />
                  ) : (
                    player.isHost ? '👑' : player.userId === me.userId ? '👤' : '🧑'
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium">{player.username}</div>
                  <div className="text-white/50 text-sm">
                    {player.isHost && 'Host • '}
                    {player.isConnected ? 'Conectado' : 'Desconectado'}
                    {player.isProtected && ' • 🛡️ Protegido'}
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
            {/* ✅ DEBUG: Por que não há alvos */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-white/30">
                Debug: Alive players: {alivePlayers.length} | Phase: {gameState.phase} | Role: {me.role}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      {validTargets.length > 0 && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-4">
          {!confirmingAction ? (
            <button
              onClick={() => {
                console.log('🎯 ActionPanel: Confirming action:', {
                  selectedTarget,
                  actionType: actionInfo.title
                });
                setConfirmingAction(true);
              }}
              disabled={!selectedTarget || isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' :
                selectedTarget
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
                  onClick={() => {
                    console.log('🎯 ActionPanel: Action confirmed, executing...');
                    gameState.phase === 'VOTING' ? handleVote() : handleNightAction();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {isSubmitting ? 'Enviando...' : '✓ Confirmar'}
                </button>

                <button
                  onClick={() => {
                    console.log('🎯 ActionPanel: Action cancelled');
                    setConfirmingAction(false);
                    setSelectedTarget(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
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