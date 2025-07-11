import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// ACTION PANEL COMPONENT - VERSÃO ORIGINAL COM RESPONSIVIDADE ADICIONADA
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
      userFaction: me?.faction,
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
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-2 md:p-4">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner text="Carregando ações..." />
        </div>
      </div>
    );
  }

  // =============================================================================
  // ✅ CORRIGIDO: ACTION HANDLERS COM LOGS DETALHADOS E TIPOS CORRETOS
  // =============================================================================
  const handleNightAction = async () => {
    if (!selectedTarget || !me.role || isSubmitting) return;

    // ✅ CORREÇÃO PRINCIPAL: Mapear role para tipo de ação exato que o backend espera
    let actionType: string | null = null;
    switch (me.role) {
      case 'SHERIFF':
        actionType = 'INVESTIGATE';
        break;
      case 'DOCTOR':
        actionType = 'PROTECT';
        break;
      case 'WEREWOLF':
      case 'WEREWOLF_KING':
        actionType = 'WEREWOLF_KILL'; // ✅ Esta é a correção principal
        break;
      case 'VIGILANTE':
        actionType = 'VIGILANTE_KILL';
        break;
      case 'SERIAL_KILLER':
        actionType = 'SERIAL_KILL';
        break;
      default:
        actionType = null;
    }

    if (actionType) {
      setIsSubmitting(true);

      console.log('--- CHECKPOINT 1: FRONTEND --- Enviando Ação:', {
        actionType,
        targetId: selectedTarget,
        timestamp: new Date().toISOString()
      });

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
          type: actionType, // ✅ Enviar o tipo correto
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
  // ✅ LÓGICA DAS AÇÕES (ORIGINAL MANTIDA) - CORRIGIDA TIPAGEM
  // =============================================================================
  const getActionInfo = () => {
    if (gameState.phase === 'VOTING') {
      return {
        title: '🗳️ Votem para executar!',
        description: 'Escolha quem deve ser executado pela vila',
        canAct: canVote,
        actionText: 'Votar em',
        isVoting: true
      };
    }

    if (gameState.phase === 'NIGHT' && me.role) {
      const roleActions = {
        WEREWOLF: { title: '🐺 Ataque Lobisomem', description: 'Escolha um aldeão para eliminar', actionText: 'Atacar', canAct: canAct },
        SHERIFF: { title: '🔍 Investigação', description: 'Investigue um jogador', actionText: 'Investigar', canAct: canAct },
        DOCTOR: { title: '💉 Proteção', description: 'Proteja alguém dos ataques', actionText: 'Proteger', canAct: canAct },
        VIGILANTE: { title: '🔫 Justiça', description: 'Atire em um suspeito', actionText: 'Atirar em', canAct: canAct },
        SERIAL_KILLER: { title: '🔪 Assassinato', description: 'Elimine um jogador', actionText: 'Eliminar', canAct: canAct },
        JESTER: { title: '🃏 Jester', description: 'Você não age durante a noite', actionText: 'Aguardar', canAct: false },
        VILLAGER: { title: '🏘️ Aldeão', description: 'Você não possui habilidades especiais', actionText: 'Aguardar', canAct: false }
      };

      const roleAction = roleActions[me.role as keyof typeof roleActions];
      if (roleAction) {
        return {
          title: roleAction.title,
          description: roleAction.description,
          canAct: roleAction.canAct,
          actionText: roleAction.actionText,
          isVoting: false
        };
      }
    }

    return {
      title: '⏳ Aguardando',
      description: 'Aguarde o início da próxima fase',
      canAct: false,
      actionText: 'Aguardar',
      isVoting: false
    };
  };

  const actionInfo = getActionInfo();
  const validTargets = alivePlayers.filter(p => p.id !== me.id);
  const myVote = gameState.votes?.[me.userId];

  // =============================================================================
  // ✅ HAS VOTED - UNVOTE INTERFACE (ORIGINAL MANTIDA)
  // =============================================================================
  if (myVote && gameState.phase === 'VOTING') {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

        {/* Header - Mais compacto SEM DEBUG */}
        <div className="flex-shrink-0 border-b border-medieval-600 p-3">
          <h3 className="text-base font-bold text-white mb-1">✅ Voto Registrado</h3>
          <p className="text-white/70 text-xs">Você já votou nesta rodada</p>
        </div>

        <div className="flex-1 flex flex-col justify-center p-3">
          <div className="text-center mb-6">
            <div className="text-3xl mb-4">🗳️</div>
            <div className="text-green-400 font-bold text-sm mb-2">Seu voto foi registrado!</div>
            <div className="text-white text-base">
              Você votou em: <span className="font-bold">{validTargets.find(p => p.id === myVote)?.username}</span>
            </div>
          </div>

          <button
            onClick={handleUnvote}
            disabled={isSubmitting}
            className={`
              w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200
              ${isSubmitting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
              }
            `}
          >
            {isSubmitting ? 'Removendo...' : 'Remover Voto'}
          </button>
        </div>
      </div>
    );
  }

  // =============================================================================
  // ✅ MAIN ACTION INTERFACE (ORIGINAL COM RESPONSIVIDADE)
  // =============================================================================
  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Header - Mais compacto SEM DEBUG */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-3">
        <h3 className="text-base font-bold text-white mb-1">{actionInfo.title}</h3>
        <p className="text-white/70 text-xs">{actionInfo.description}</p>
      </div>

      {/* Target Selection - Mais compacto */}
      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="text-white font-semibold mb-2 text-sm">Escolha um alvo:</h4>

        <div className="space-y-1">
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
                w-full p-2 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedTarget === player.id
                  ? 'border-amber-400 bg-amber-900/30'
                  : 'border-medieval-600 bg-medieval-700/30 hover:border-amber-400/50 hover:bg-medieval-700/50'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-medieval-600 flex items-center justify-center text-xs">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.username} className="w-full h-full rounded-full" />
                  ) : (
                    player.isHost ? '👑' : player.userId === me.userId ? '👤' : '🧑'
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{player.username}</div>
                  <div className="text-white/50 text-xs">
                    {player.isHost && 'Host • '}
                    {player.isConnected ? 'Conectado' : 'Desconectado'}
                    {player.isProtected && ' • 🛡️ Protegido'}
                  </div>
                </div>

                {selectedTarget === player.id && (
                  <div className="text-amber-400 text-lg">👈</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {validTargets.length === 0 && (
          <div className="text-center text-white/50 py-8">
            <div className="text-3xl md:text-4xl mb-2">🚫</div>
            <p className="text-sm md:text-base">Nenhum alvo válido disponível</p>
            {/* ✅ DEBUG: Por que não há alvos */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-white/30">
                Debug: Alive players: {alivePlayers.length} | Phase: {gameState.phase} | Role: {me.role}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button - Mais compacto */}
      {validTargets.length > 0 && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-3">
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
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? 'Enviando...' :
                selectedTarget
                  ? `${actionInfo.actionText} ${validTargets.find(p => p.id === selectedTarget)?.username}`
                  : 'Selecione um alvo'
              }
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-center text-amber-400 font-semibold text-sm">
                ⚠️ Confirmar ação?
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    console.log('🎯 ActionPanel: Action cancelled');
                    setConfirmingAction(false);
                    setSelectedTarget(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => {
                    console.log('🎯 ActionPanel: Action confirmed, executing...');
                    gameState.phase === 'VOTING' ? handleVote() : handleNightAction();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Enviando...' : 'CONFIRMAR'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}