import React, { useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// TYPES
// =============================================================================
interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  channel: 'public' | 'werewolf' | 'spectator' | 'system' | 'dead';
  timestamp: string;
  filtered?: boolean;
  isWhisper?: boolean;
  targetUserId?: string;
  edited?: boolean;
  editedAt?: string;
}

// =============================================================================
// SYSTEM CHAT COMPONENT - APENAS MENSAGENS DO SISTEMA (SEM CHAT PÚBLICO)
// =============================================================================
export default function ActionPanel() {
  const { gameState, chatMessages, me, canVote, canAct } = useGame();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // AUTO SCROLL TO BOTTOM
  // =============================================================================
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex items-center justify-center">
        <LoadingSpinner text="Carregando chat do sistema..." />
      </div>
    );
  }

  // =============================================================================
  // FILTER SYSTEM MESSAGES
  // =============================================================================
  const systemMessages = chatMessages.filter(msg =>
    msg.channel === 'system' || msg.userId === 'system'
  );

  // =============================================================================
  // MESSAGE FORMATTING
  // =============================================================================
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getMessageIcon = (message: string) => {
    if (message.includes('morreu') || message.includes('eliminado') || message.includes('foi executado')) return '💀';
    if (message.includes('protegido') || message.includes('protegeu')) return '🛡️';
    if (message.includes('investigou') || message.includes('investigação')) return '🔍';
    if (message.includes('votou') || message.includes('voto')) return '🗳️';
    if (message.includes('atacou') || message.includes('matou')) return '🐺';
    if (message.includes('noite') || message.includes('anoiteceu')) return '🌙';
    if (message.includes('dia') || message.includes('amanheceu')) return '☀️';
    if (message.includes('vitória') || message.includes('venceu') || message.includes('ganhou')) return '🏆';
    if (message.includes('iniciou') || message.includes('começou') || message.includes('jogo')) return '🎮';
    if (message.includes('conectou') || message.includes('entrou')) return '🔌';
    if (message.includes('desconectou') || message.includes('saiu')) return '🔌';
    return 'ℹ️';
  };

  const getMessageColor = (message: string) => {
    if (message.includes('morreu') || message.includes('eliminado') || message.includes('foi executado')) return 'text-red-300';
    if (message.includes('protegido') || message.includes('protegeu')) return 'text-green-300';
    if (message.includes('investigou') || message.includes('investigação')) return 'text-yellow-300';
    if (message.includes('votou') || message.includes('voto')) return 'text-orange-300';
    if (message.includes('atacou') || message.includes('matou')) return 'text-red-400';
    if (message.includes('vitória') || message.includes('venceu') || message.includes('ganhou')) return 'text-purple-300';
    if (message.includes('iniciou') || message.includes('começou') || message.includes('jogo')) return 'text-blue-300';
    if (message.includes('noite') || message.includes('anoiteceu')) return 'text-indigo-300';
    if (message.includes('dia') || message.includes('amanheceu')) return 'text-yellow-200';
    return 'text-white/90';
  };

  // =============================================================================
  // GAME STATUS INFO - MANTENDO SUA VERSÃO SIMPLES
  // =============================================================================
  const getGameStatusInfo = () => {
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);
    const deadPlayers = gameState.players.filter(p => !p.isAlive && !p.isSpectator);
    
    return {
      phase: gameState.phase,
      day: gameState.day,
      alivePlayers: alivePlayers.length,
      deadPlayers: deadPlayers.length,
      timeLeft: gameState.timeLeft,
    };
  };

  // =============================================================================
  // ACTION INFO - PRESERVANDO A LÓGICA DELE COMO FALLBACK (COMENTADA)
  // =============================================================================
  /*
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

    if (gameState.phase === 'NIGHT' && me?.role) {
      const roleActions = {
        WEREWOLF_KING: { title: '👑 Ataque da Alcateia', description: 'Escolha a presa para a alcateia eliminar', actionText: 'Atacar', canAct: canAct },
        WEREWOLF: { title: '🐺 Alcateia', description: 'Você segue as ordens do seu Rei. Aguarde a decisão...', actionText: 'Aguardar', canAct: false },
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

    return null;
  };
  */

  const statusInfo = getGameStatusInfo();

  // =============================================================================
  // RENDER COMPONENT - MANTENDO SUA INTERFACE
  // =============================================================================
  return (
    <div className="h-full flex flex-col bg-medieval-800/50 border border-medieval-600 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-medieval-700/70 border-b border-medieval-600 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">💬</span>
          <h3 className="text-white font-bold text-base font-medieval">
            Chat do Sistema
          </h3>
        </div>

        {/* Game Status - More compact */}
        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">📅</span>
            <span>Dia {statusInfo.day}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">👥</span>
            <span>{statusInfo.alivePlayers} vivos</span>
          </div>
          {statusInfo.deadPlayers > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-red-400">💀</span>
              <span>{statusInfo.deadPlayers} mortos</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {systemMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-center text-sm">
              Aqui ficaria o chat do sistema
            </p>
            <p className="text-center text-xs text-white/40 mt-1">
              Aguardando eventos...
            </p>
          </div>
        ) : (
          systemMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black/20 rounded-md p-2 border-l-2 border-medieval-500/50 backdrop-blur-sm"
            >
              <div className="flex items-start gap-2">
                <div className="text-lg flex-shrink-0">
                  {getMessageIcon(msg.message)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-medieval-300 text-xs font-medium">
                      Sistema
                    </span>
                    <span className="text-white/40 text-xs">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${getMessageColor(msg.message)}`}>
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer with info */}
      <div className="bg-medieval-700/50 border-t border-medieval-600 p-2">
        <div className="text-center text-white/60 text-xs">
          📢 Eventos e notificações do jogo aparecem aqui
        </div>
      </div>
    </div>
  );
}