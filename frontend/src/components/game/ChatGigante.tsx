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
  channel: 'public' | 'werewolf' | 'dead' | 'system';
  timestamp: string;
  filtered?: boolean;
}

type ChatTab = 'public' | 'werewolf' | 'dead' | 'system';

// =============================================================================
// CHAT GIGANTE COMPONENT - CORAÇÃO DO JOGO
// =============================================================================
export default function ChatGigante() {
  const { gameState, me } = useGame();
  const { sendMessage } = useSocket();

  const [activeTab, setActiveTab] = useState<ChatTab>('public');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  }, [messages]);

  // =============================================================================
  // LISTEN FOR CHAT MESSAGES
  // =============================================================================
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const data = event.detail;

      if (data.type === 'chat-message') {
        const newMessage: ChatMessage = {
          id: data.data.message?.id || Date.now().toString(),
          userId: data.data.message?.userId || data.data.userId,
          username: data.data.message?.username || data.data.username,
          message: data.data.message?.message || data.data.message,
          channel: data.data.message?.channel || data.data.channel || 'public',
          timestamp: data.data.message?.timestamp || data.data.timestamp || new Date().toISOString(),
          filtered: data.data.message?.filtered,
        };

        setMessages(prev => [...prev, newMessage]);
      }

      // System messages from game events
      if (data.type === 'phase-changed') {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'Sistema',
          message: `Fase mudou para ${data.data.phase}`,
          channel: 'system',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMessage]);
      }

      if (data.type === 'player-died') {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'Sistema',
          message: `${data.data.playerName || 'Um jogador'} foi eliminado!`,
          channel: 'system',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    };

    window.addEventListener('websocket-message', handleChatMessage as EventListener);
    return () => window.removeEventListener('websocket-message', handleChatMessage as EventListener);
  }, []);

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
  // DETERMINE AVAILABLE TABS
  // =============================================================================
  const getAvailableTabs = (): ChatTab[] => {
    const tabs: ChatTab[] = ['public'];

    if (me?.role === 'WEREWOLF' || me?.role === 'WEREWOLF_KING') {
      tabs.push('werewolf');
    }

    if (!me?.isAlive) {
      tabs.push('dead');
    }

    tabs.push('system');

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  // =============================================================================
  // FILTER MESSAGES BY TAB
  // =============================================================================
  const getMessagesForTab = (tab: ChatTab): ChatMessage[] => {
    return messages.filter(msg => {
      switch (tab) {
        case 'public':
          return msg.channel === 'public';
        case 'werewolf':
          return msg.channel === 'werewolf';
        case 'dead':
          return msg.channel === 'dead';
        case 'system':
          return msg.channel === 'system';
        default:
          return false;
      }
    });
  };

  // =============================================================================
  // SEND MESSAGE
  // =============================================================================
  const handleSendMessage = async () => {
    if (!message.trim() || !gameState || isSubmitting) return;

    setIsSubmitting(true);

    const success = sendMessage('chat-message', {
      message: message.trim(),
      channel: activeTab,
    });

    if (success) {
      setMessage('');
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 200);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // =============================================================================
  // TAB CONFIGURATION
  // =============================================================================
  const getTabConfig = (tab: ChatTab) => {
    switch (tab) {
      case 'public':
        return {
          name: 'Público',
          icon: '🗣️',
          color: 'text-white',
          bgColor: 'bg-blue-600',
          available: true,
        };
      case 'werewolf':
        return {
          name: 'Lobisomens',
          icon: '🐺',
          color: 'text-red-400',
          bgColor: 'bg-red-600',
          available: me?.role === 'WEREWOLF' || me?.role === 'WEREWOLF_KING',
        };
      case 'dead':
        return {
          name: 'Mortos',
          icon: '👻',
          color: 'text-gray-400',
          bgColor: 'bg-gray-600',
          available: !me?.isAlive,
        };
      case 'system':
        return {
          name: 'Sistema',
          icon: '⚙️',
          color: 'text-amber-400',
          bgColor: 'bg-amber-600',
          available: true,
        };
    }
  };

  // =============================================================================
  // CHECK CHAT RESTRICTIONS
  // =============================================================================
  const canSendMessage = () => {
    if (!me.isAlive && activeTab !== 'dead') return false;
    if (activeTab === 'system') return false;
    if (activeTab === 'werewolf' && me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') return false;
    if (gameState.phase === 'NIGHT' && activeTab === 'public' && me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') return false;
    return true;
  };

  // =============================================================================
  // MESSAGE COMPONENT
  // =============================================================================
  const ChatMessageComponent = ({ msg }: { msg: ChatMessage }) => {
    const isMe = msg.userId === me?.userId;
    const isSystem = msg.channel === 'system';

    return (
      <div className={`p-2 border-b border-medieval-600/30 ${isMe ? 'bg-blue-900/20' : ''}`}>
        <div className="flex items-start space-x-2">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-medieval-700 flex items-center justify-center">
            {isSystem ? '🤖' : isMe ? '👤' : '🧑'}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`font-semibold text-sm ${isMe ? 'text-blue-300' : 'text-white'}`}>
                {msg.username}
              </span>
              <span className="text-xs text-white/50">
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="text-white/90 text-sm break-words">
              {msg.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Chat Header */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>💬</span>
            <span>Chat do Jogo</span>
          </h2>

          {gameState && (
            <div className="text-xs text-white/50">
              Dia {gameState.day} - {gameState.phase}
            </div>
          )}
        </div>

        {/* Chat Tabs */}
        <div className="flex space-x-1">
          {availableTabs.map((tab) => {
            const config = getTabConfig(tab);
            const tabMessages = getMessagesForTab(tab);
            const unreadCount = tabMessages.length; // Simplified unread logic

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${activeTab === tab
                    ? `${config.bgColor} text-white`
                    : 'bg-medieval-700/50 text-white/70 hover:bg-medieval-700'
                  }
                `}
              >
                <div className="flex items-center space-x-1">
                  <span>{config.icon}</span>
                  <span>{config.name}</span>
                </div>

                {/* Unread Badge */}
                {tab !== activeTab && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto bg-medieval-900/20">
        {getMessagesForTab(activeTab).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white/50">
              <div className="text-4xl mb-2">{getTabConfig(activeTab).icon}</div>
              <p>Nenhuma mensagem ainda...</p>
              <p className="text-xs mt-1">
                {activeTab === 'public' && 'Seja o primeiro a falar!'}
                {activeTab === 'werewolf' && 'Coordenem seus ataques...'}
                {activeTab === 'dead' && 'O além está silencioso...'}
                {activeTab === 'system' && 'Aguardando eventos...'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {getMessagesForTab(activeTab).map((msg) => (
              <ChatMessageComponent key={msg.id} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 border-t border-medieval-600 p-4">
        {/* Phase restriction info */}
        {gameState?.phase === 'NIGHT' && activeTab === 'public' && me?.role !== 'WEREWOLF' && me?.role !== 'WEREWOLF_KING' && (
          <div className="mb-2 text-xs text-amber-400 text-center">
            🌙 Durante a noite, apenas Lobisomens podem conversar no chat público
          </div>
        )}

        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !canSendMessage() ? 'Você não pode falar neste canal agora' :
                activeTab === 'public' ? 'Digite sua mensagem...' :
                  activeTab === 'werewolf' ? 'Coordenem seus ataques...' :
                    activeTab === 'dead' ? 'Fale com outros mortos...' :
                      'Mensagem do sistema...'
            }
            disabled={!canSendMessage() || isSubmitting}
            className="flex-1 bg-medieval-700 border border-medieval-600 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || !canSendMessage() || isSubmitting}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '...' : 'Enviar'}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-2 text-xs text-white/50 text-center">
          💡 Use Enter para enviar • Shift+Enter para quebrar linha
        </div>
      </div>
    </div>
  );
}