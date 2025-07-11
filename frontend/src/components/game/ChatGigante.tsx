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

type ChatTab = 'public' | 'werewolf' | 'dead' | 'system';

// =============================================================================
// CHAT GIGANTE COMPONENT - VERSÃO LIMPA SEM DEBUG
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
    return chatMessages.filter(msg => {
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
  // CHECK CHAT RESTRICTIONS (SEM LOGS)
  // =============================================================================
  const canSendMessage = () => {
    // Verificações básicas, se não tiver dados, não pode enviar
    if (!me || !gameState) {
      return false;
    }

    // REGRA 1: Se o jogador está morto, ele SÓ pode falar no chat dos mortos
    if (!me.isAlive) {
      return activeTab === 'dead';
    }

    // A partir daqui, o jogador está VIVO

    // REGRA 2 (A REGRA DE OURO): Se for noite E o chat for público, NINGUÉM FALA
    if (gameState.phase === 'NIGHT' && activeTab === 'public') {
      return false; // ❌ Chat público bloqueado durante a noite para TODOS
    }

    // REGRA 3: Durante a NOITE, apenas lobisomens podem usar o chat de lobisomens
    if (gameState.phase === 'NIGHT' && activeTab === 'werewolf') {
      const isWerewolf = me.role === 'WEREWOLF' || me.role === 'WEREWOLF_KING';
      return isWerewolf;
    }

    // REGRA 4: Se NÃO for noite (Dia ou Votação), o único chat para os vivos é o público
    if (gameState.phase === 'DAY' || gameState.phase === 'VOTING') {
      return activeTab === 'public';
    }

    // REGRA 5: Nunca permitir envio no canal do sistema
    if (activeTab === 'system') {
      return false;
    }

    // REGRA 6: Chat de lobisomens só para lobisomens (em qualquer fase)
    if (activeTab === 'werewolf') {
      return me.role === 'WEREWOLF' || me.role === 'WEREWOLF_KING';
    }

    // Se não se encaixar em nenhuma regra acima, bloqueia por segurança
    return false;
  };

  // =============================================================================
  // SEND MESSAGE (SEM DEBUG)
  // =============================================================================
  const handleSendMessage = async () => {
    if (!message.trim() || !gameState || isSubmitting || !canSendMessage()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = sendMessage('chat-message', {
        message: message.trim(),
        channel: activeTab,
      });

      if (success) {
        setMessage('');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 200);
    }
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
  // MESSAGE COMPONENT
  // =============================================================================
  const ChatMessageComponent = ({ msg }: { msg: ChatMessage }) => {
    const isMe = msg.userId === me?.userId;
    const isSystem = msg.channel === 'system';

    return (
      <div className={`p-2 border-b border-medieval-600/30 ${isMe ? 'bg-blue-900/20' : ''}`}>
        <div className="flex items-start space-x-2">
          {/* Avatar */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-medieval-700 flex items-center justify-center text-xs">
            {isSystem ? '🤖' : isMe ? '👤' : '🧑'}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`font-semibold text-xs ${isMe ? 'text-blue-300' : isSystem ? 'text-amber-300' : 'text-white'}`}>
                {msg.username}
              </span>
              <span className="text-xs text-white/50">
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {isSystem && (
                <span className="text-xs bg-amber-600 text-white px-1 rounded">
                  SISTEMA
                </span>
              )}
            </div>

            <div className={`text-xs break-words ${isSystem ? 'text-amber-100' : 'text-white/90'}`}>
              {msg.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =============================================================================
  // GET CHAT RESTRICTION MESSAGE
  // =============================================================================
  const getChatRestrictionMessage = () => {
    if (!me.isAlive && activeTab !== 'dead') {
      return "Você está morto e só pode usar o chat dos mortos";
    }

    if (activeTab === 'system') {
      return "Você não pode enviar mensagens no canal do sistema";
    }

    if (activeTab === 'werewolf' && me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') {
      return "Apenas lobisomens podem usar este chat";
    }

    if (gameState.phase === 'NIGHT' && activeTab === 'public' &&
      me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') {
      return "Durante a noite, apenas Lobisomens podem conversar entre si";
    }

    return null;
  };

  const restrictionMessage = getChatRestrictionMessage();

  return (
    <div className="h-full bg-medieval-800/30 border border-medieval-600 rounded-lg flex flex-col">

      {/* Chat Header - Compacto */}
      <div className="flex-shrink-0 border-b border-medieval-600 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>💬</span>
            <span>Chat do Jogo</span>
          </h2>

          {gameState && (
            <div className="text-xs text-white/50">
              Dia {gameState.day} - {gameState.phase}
            </div>
          )}
        </div>

        {/* Chat Tabs - Compactos */}
        <div className="flex space-x-1">
          {availableTabs.map((tab) => {
            const config = getTabConfig(tab);
            const tabMessages = getMessagesForTab(tab);
            const unreadCount = tab !== activeTab ? tabMessages.length : 0;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-all duration-200 relative
                  ${activeTab === tab
                    ? `${config.bgColor} text-white`
                    : 'bg-medieval-700 text-white/70 hover:text-white'
                  }
                `}
              >
                <span className="mr-1">{config.icon}</span>
                <span className="hidden sm:inline">{config.name}</span>

                {/* Unread count */}
                {unreadCount > 0 && tab !== 'system' && (
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
          <div>
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

        {/* Help text - Compacto */}
        <div className="mt-1 text-xs text-white/50 text-center">
          💡 Use Enter para enviar • Shift+Enter para quebrar linha
        </div>
      </div>
    </div>
  );
}