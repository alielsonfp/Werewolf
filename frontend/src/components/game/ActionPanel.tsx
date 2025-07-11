import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// ACTION PANEL COMPONENT - VERSÃO FINAL CORRIGIDA
// =============================================================================
export default function ActionPanel() {
  const { gameState, me, alivePlayers, canVote, canAct } = useGame();
  const { sendMessage } = useSocket();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LOG de estado para debug
  useEffect(() => {
    console.log('🎯 ActionPanel: State Update:', {
      gamePhase: gameState?.phase,
      userRole: me?.role,
      userHasVoted: me?.hasVoted,
      myVoteValue: gameState?.votes?.[me?.id || ''],
      isSubmitting,
      confirmingAction,
      selectedTarget,
    });
  }, [gameState?.phase, me?.hasVoted, gameState?.votes, me?.id, isSubmitting, confirmingAction, selectedTarget]);

  const myVote = gameState?.votes?.[me?.id || ''];
  const validTargets = alivePlayers.filter(p => p.id !== me?.id);

  // Efeito que reseta o estado de "submitting" quando o voto é confirmado no estado global.
  // Isso acontece quando o `gameState` é atualizado pelo WebSocket.
  useEffect(() => {
    if (myVote && isSubmitting) {
      console.log('✅ ActionPanel: Vote confirmed by gameState update. Resetting UI state.');
      setIsSubmitting(false);
      setConfirmingAction(false);
      setSelectedTarget(null);
    }
  }, [myVote, isSubmitting]);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const handleNightAction = async () => {
    if (!selectedTarget || !me?.role || isSubmitting) return;

    let actionType: string | null = null;
    switch (me.role) {
      case 'SHERIFF': actionType = 'INVESTIGATE'; break;
      case 'DOCTOR': actionType = 'PROTECT'; break;
      case 'WEREWOLF': case 'WEREWOLF_KING': actionType = 'WEREWOLF_KILL'; break;
      case 'VIGILANTE': actionType = 'VIGILANTE_KILL'; break;
      case 'SERIAL_KILLER': actionType = 'SERIAL_KILL'; break;
    }

    if (actionType) {
      setIsSubmitting(true);
      setConfirmingAction(false); // Esconde botões de confirmação

      console.log(`🌙 ActionPanel: Sending night action [${actionType}]`);
      sendMessage('game-action', { type: actionType, targetId: selectedTarget });
      // A UI vai esperar a atualização do `gameState` para indicar que a ação foi computada (`me.hasActed = true`)
    }
  };

  const handleVote = async () => {
    if (!selectedTarget || isSubmitting) return;

    setIsSubmitting(true);
    setConfirmingAction(false); // Esconde botões de confirmação

    console.log(`🗳️ ActionPanel: Sending vote for [${selectedTarget}]`);
    sendMessage('vote', { targetId: selectedTarget });
    // A UI agora mostrará o estado de "Processando..." e aguardará o `gameState` ser atualizado.
  };

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState || !me) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-2 md:p-4 flex items-center justify-center">
        <LoadingSpinner text="Carregando ações..." />
      </div>
    );
  }

  // =============================================================================
  // RENDERIZAÇÃO CONDICIONAL (MÁQUINA DE ESTADOS VISUAL)
  // =============================================================================

  // Estado 1: Voto ou ação noturna está sendo enviada/processada
  if (isSubmitting) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
        <LoadingSpinner size="lg" />
        <p className="text-white/70 mt-4">Processando...</p>
      </div>
    );
  }

  // Estado 2: O jogador já realizou sua ação definitiva (votou ou agiu à noite)
  const hasVoted = !!myVote;
  const hasActedAtNight = gameState.phase === 'NIGHT' && me.hasActed;

  if (hasVoted || hasActedAtNight) {
    const votedPlayer = hasVoted ? (validTargets.find(p => p.id === myVote) || alivePlayers.find(p => p.id === myVote)) : null;
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl mb-4">{hasVoted ? '🗳️' : '🌙'}</div>
        <h3 className="text-lg font-bold text-white mb-2">
          {hasVoted ? 'Voto Confirmado!' : 'Ação Realizada!'}
        </h3>
        <p className="text-white/80">
          {hasVoted
            ? <>Você votou para executar <span className="font-bold text-amber-300">{votedPlayer?.username || 'um jogador'}</span>.</>
            : 'Sua ação para esta noite foi registrada.'
          }
        </p>
        <p className="text-sm text-white/60 mt-4">
          Aguarde o desenrolar dos acontecimentos.
        </p>
      </div>
    );
  }

  // Estado 3: Padrão - Escolha de ação
  const getActionInfo = () => {
    if (gameState.phase === 'VOTING') {
      return { title: '🗳️ Votem para executar!', description: 'Escolha quem deve ser executado pela vila', actionText: 'Votar em' };
    }
    if (gameState.phase === 'NIGHT' && me.role) {
      const roleActions: { [key: string]: { title: string; description: string; actionText: string } } = {
        WEREWOLF: { title: '🐺 Ataque Lobisomem', description: 'Escolha um aldeão para eliminar', actionText: 'Atacar' },
        SHERIFF: { title: '🔍 Investigação', description: 'Investigue um jogador', actionText: 'Investigar' },
        DOCTOR: { title: '💉 Proteção', description: 'Proteja alguém dos ataques', actionText: 'Proteger' },
        VIGILANTE: { title: '🔫 Justiça', description: 'Atire em um suspeito', actionText: 'Atirar em' },
        SERIAL_KILLER: { title: '🔪 Assassinato', description: 'Elimine um jogador', actionText: 'Eliminar' }
      };
      return roleActions[me.role] || { title: '⏳ Aguardando', description: 'Você descansa esta noite.', actionText: '' };
    }
    return { title: '⏳ Aguardando', description: 'Aguarde o início da próxima fase.', actionText: '' };
  };

  const actionInfo = getActionInfo();
  const canPerformAction = (gameState.phase === 'VOTING' && canVote) || (gameState.phase === 'NIGHT' && canAct);

  // Se o jogador não pode agir nesta fase (ex: Aldeão à noite)
  if (!canPerformAction) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h3 className="text-lg font-bold text-white mb-2">Aguardando</h3>
        <p className="text-white/80">Você não realiza ações nesta fase.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">
      <div className="flex-shrink-0 border-b border-medieval-600 p-3">
        <h3 className="text-base font-bold text-white mb-1">{actionInfo.title}</h3>
        <p className="text-white/70 text-xs">{actionInfo.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="text-white font-semibold mb-2 text-sm">Escolha um alvo:</h4>
        <div className="space-y-1">
          {validTargets.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedTarget(player.id)}
              className={`w-full p-2 rounded-lg border-2 transition-all duration-200 text-left ${selectedTarget === player.id ? 'border-amber-400 bg-amber-900/30' : 'border-medieval-600 bg-medieval-700/30 hover:border-amber-400/50 hover:bg-medieval-700/50'}`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-medieval-600 flex items-center justify-center text-xs">
                  {player.avatar ? <img src={player.avatar} alt={player.username} className="w-full h-full rounded-full" /> : (player.isHost ? '👑' : '🧑')}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{player.username}</div>
                </div>
                {selectedTarget === player.id && <div className="text-amber-400 text-lg">👈</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {validTargets.length > 0 && (
        <div className="flex-shrink-0 border-t border-medieval-600 p-3">
          {!confirmingAction ? (
            <button
              onClick={() => setConfirmingAction(true)}
              disabled={!selectedTarget}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed text-sm"
            >
              {selectedTarget ? `${actionInfo.actionText} ${validTargets.find(p => p.id === selectedTarget)?.username}` : 'Selecione um alvo'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-center text-amber-400 font-semibold text-sm">
                ⚠️ Confirmar ação em <span className="font-bold">{validTargets.find(p => p.id === selectedTarget)?.username}</span>? A ação é final.
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setConfirmingAction(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={gameState.phase === 'VOTING' ? handleVote : handleNightAction}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}