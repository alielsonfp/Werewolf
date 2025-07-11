import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
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

// ✅ ALTERAÇÃO: Removido 'system' dos tipos de aba disponíveis
type ChatTab = 'public' | 'werewolf' | 'dead';

// =============================================================================
// CHAT GIGANTE COMPONENT - SEM MENSAGENS DO SISTEMA
// =============================================================================
export default function ChatGigante() {
  const { gameState, me, chatMessages } = useGame();
  const { sendMessage } = useSocket();

  const [activeTab, setActiveTab] = useState<ChatTab>('public');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  if (!gameState || !me) {
    return (
      <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex items-center justify-center">
        <LoadingSpinner text="Carregando chat..." />
      </div>
    );
  }

  // =============================================================================
  // ✅ ALTERAÇÃO: DETERMINE AVAILABLE TABS (SEM SYSTEM)
  // =============================================================================
  const getAvailableTabs = (): ChatTab[] => {
    const tabs: ChatTab[] = ['public'];

    // Werewolf chat (apenas para lobisomens vivos)
    if (me.faction === 'WEREWOLF' && me.isAlive) {
      tabs.push('werewolf');
    }

    // Dead chat (apenas para mortos)
    if (!me.isAlive) {
      tabs.push('dead');
    }

    return tabs;
  };

  // =============================================================================
  // ✅ ALTERAÇÃO: FILTER MESSAGES (EXCLUINDO SYSTEM)
  // =============================================================================
  const getMessagesForTab = (tab: ChatTab): ChatMessage[] => {
    return chatMessages.filter(msg => {
      // ✅ IMPORTANTE: Excluir mensagens do sistema do chat
      if (msg.channel === 'system') return false;

      switch (tab) {
        case 'public':
          return msg.channel === 'public';
        case 'werewolf':
          return msg.channel === 'werewolf';
        case 'dead':
          return msg.channel === 'dead';
        default:
          return false;
      }
    });
  };

  // =============================================================================
  // MESSAGE RESTRICTIONS
  // =============================================================================
  const canSendMessage = (): boolean => {
    if (!gameState || !me) return false;

    switch (activeTab) {
      case 'public':
        // Pode falar durante o dia ou se estiver morto (como espectador)
        return gameState.phase === 'DAY' || !me.isAlive;
      case 'werewolf':
        // Lobisomens podem falar durante a noite
        return (me.faction === 'WEREWOLF') && (me.isAlive ?? false) && gameState.phase === 'NIGHT';
      case 'dead':
        // Mortos podem sempre falar entre si
        return !(me.isAlive ?? true);
      default:
        return false;
    }
  };

  const getRestrictionMessage = (): string | null => {
    if (!gameState || !me) return 'Carregando...';

    if (activeTab === 'public' && gameState.phase === 'NIGHT' && (me.isAlive ?? false)) {
      return 'Você não pode falar durante a noite. Aguarde o dia.';
    }

    if (activeTab === 'werewolf' && gameState.phase === 'DAY') {
      return 'Canal werewolf apenas disponível durante a noite.';
    }

    return null;
  };

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  const handleSendMessage = async () => {
    if (!message.trim() || isSubmitting || !canSendMessage()) return;

    setIsSubmitting(true);
    try {
      const success = sendMessage('chat-message', {
        message: message.trim(),
        channel: activeTab,
      });

      if (success) {
        setMessage('');
      } else {
        console.error('Failed to send message - WebSocket not connected');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // =============================================================================
  // ✅ ALTERAÇÃO: TAB CONFIGURATION (SEM SYSTEM)
  // =============================================================================
  const tabConfigs = {
    public: { name: 'Público', icon: '🏘️', bgColor: 'bg-blue-600' },
    werewolf: { name: 'Lobisomens', icon: '🐺', bgColor: 'bg-red-600' },
    dead: { name: 'Mortos', icon: '💀', bgColor: 'bg-gray-600' },
  };

  const availableTabs = getAvailableTabs();
  const restrictionMessage = getRestrictionMessage();

  // =============================================================================
  // CHAT MESSAGE COMPONENT
  // =============================================================================
  const ChatMessageComponent = ({ msg }: { msg: ChatMessage }) => {
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getMessageStyle = (channel: string) => {
      switch (channel) {
        case 'public':
          return 'bg-blue-900/20 border-blue-600/30';
        case 'werewolf':
          return 'bg-red-900/20 border-red-600/30';
        case 'dead':
        case 'spectator':
          return 'bg-gray-900/20 border-gray-600/30';
        default:
          return 'bg-medieval-700/30 border-medieval-600/30';
      }
    };

    return (
      <div className={`p-2 rounded border ${getMessageStyle(msg.channel)} text-white/90 text-sm`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-xs">
            {msg.username}
          </span>
          <span className="text-xs opacity-60">
            {formatTime(msg.timestamp)}
          </span>
        </div>
        <p className="text-sm leading-relaxed">
          {msg.message}
        </p>
      </div>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">
      {/* Header with Tabs */}
      <div className="flex-shrink-0 bg-medieval-800/50 border-b border-medieval-600 p-3">
        <div className="flex space-x-1">
          {availableTabs.map((tab) => {
            const config = tabConfigs[tab];
            const messagesCount = getMessagesForTab(tab).length;
            const unreadCount = messagesCount > 0 && tab !== activeTab ? Math.min(messagesCount, 9) : 0;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  relative px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200
                  ${activeTab === tab
                    ? `${config.bgColor} text-white`
                    : 'bg-medieval-700 text-white/70 hover:text-white'
                  }
                `}
              >
                <span className="mr-1">{config.icon}</span>
                <span className="hidden sm:inline">{config.name}</span>

                {/* Unread count */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {getMessagesForTab(activeTab).length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <div>
              <div className="text-4xl mb-2">💭</div>
              <p className="text-white/70 text-sm">Nenhuma mensagem ainda...</p>
              <p className="text-white/50 text-xs mt-1">Seja o primeiro a falar!</p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {getMessagesForTab(activeTab).map((msg) => (
              <ChatMessageComponent key={msg.id} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Restriction Message */}
      {restrictionMessage && (
        <div className="flex-shrink-0 bg-amber-900/30 border-t border-amber-600/50 p-2">
          <div className="flex items-center space-x-2 text-amber-400 text-xs">
            <span>🌙</span>
            <span>{restrictionMessage}</span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-medieval-600 p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting || !canSendMessage()}
            placeholder={canSendMessage() ? "Digite sua mensagem..." : "Você não pode falar agora..."}
            className="flex-1 bg-medieval-700 border border-medieval-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={500}
          />

          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSubmitting || !canSendMessage()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSubmitting ? '...' : 'Enviar'}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-1 text-xs text-white/50 text-center">
          💡 Use Enter para enviar • Shift+Enter para quebrar linha
        </div>
      </div>
    </div>
  );
}