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
// ACTION PANEL COMPONENT - APENAS MENSAGENS DO SISTEMA
// =============================================================================
export default function ActionPanel() {
  const { gameState, me, chatMessages } = useGame();
  const systemMessagesEndRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // ✅ FILTRAR MENSAGENS DO SISTEMA
  // =============================================================================
  const systemMessages = chatMessages.filter(msg => msg.channel === 'system');

  // Auto scroll das mensagens do sistema
  useEffect(() => {
    systemMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemMessages]);

  // =============================================================================
  // LOADING STATE
  // =============================================================================
  if (!gameState || !me) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg p-2 md:p-4">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner text="Carregando informações do sistema..." />
        </div>
      </div>
    );
  }

  // =============================================================================
  // FORMATAÇÃO DE TEMPO
  // =============================================================================
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">
      {/* Header */}
      <div className="bg-amber-900/40 px-4 py-3 border-b border-amber-600/30 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400 text-lg">📢</span>
          <span className="text-amber-400 text-lg font-medium">Informações do Sistema</span>
          {systemMessages.length > 0 && (
            <span className="bg-amber-600 text-amber-100 text-xs px-2 py-1 rounded-full">
              {systemMessages.length}
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {systemMessages.length === 0 ? (
          // Estado vazio
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="text-4xl mb-3">⏳</div>
              <h3 className="text-amber-400 text-lg font-medium mb-2">
                Aguardando Informações
              </h3>
              <p className="text-amber-400/70 text-sm">
                As mensagens do sistema aparecerão aqui conforme o jogo progride.
              </p>
            </div>
          </div>
        ) : (
          // Lista de mensagens
          <div className="space-y-3">
            {systemMessages.map((msg) => (
              <div 
                key={msg.id} 
                className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400">🔔</span>
                    <span className="font-medium text-amber-300 text-sm">Sistema</span>
                  </div>
                  <span className="text-xs text-amber-400/70">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-amber-200 text-sm leading-relaxed">
                  {msg.message}
                </p>
              </div>
            ))}
            <div ref={systemMessagesEndRef} />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 bg-amber-900/20 border-t border-amber-600/30 px-4 py-2">
        <div className="flex items-center justify-center space-x-2 text-amber-400/70 text-xs">
          <span>💡</span>
          <span>As ações dos jogadores serão implementadas ao clicar nos players</span>
        </div>
      </div>
    </div>
  );
}