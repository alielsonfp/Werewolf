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
// CHAT GIGANTE COMPONENT - VERSÃO CORRIGIDA USANDO ESTADO CENTRAL
// =============================================================================
export default function ChatGigante() {
  const { gameState, me, chatMessages } = useGame(); // ✅ CORRIGIDO: Usar chatMessages do estado central
  const { sendMessage } = useSocket();


  console.log('🎯 CHAT RENDER TRIGGERED:', {
    timestamp: Date.now(),
    chatMessagesLength: chatMessages.length,
    chatMessagesRef: chatMessages
  });
  console.log('🎯 CHAT RENDER: chatMessages count:', chatMessages.length);
  console.log('🎯 CHAT RENDER: last 3 messages:', chatMessages.slice(-3).map(m => `${m.username}: ${m.message}`));

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
  }, [chatMessages]); // ✅ CORRIGIDO: Usar chatMessages do estado central

  // ✅ REMOVIDO: O useEffect que ouvia websocket-message foi removido
  // O GameContext agora é o único responsável por processar mensagens

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
    const filteredMessages = chatMessages.filter(msg => { // ✅ CORRIGIDO: Usar chatMessages do estado central
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

    // ✅ LOG DETALHADO: Quantas mensagens temos por aba
    console.log(`📊 ChatGigante: Messages for tab "${tab}":`, {
      total: filteredMessages.length,
      messageIds: filteredMessages.map(m => m.id),
      channels: filteredMessages.map(m => m.channel)
    });

    return filteredMessages;
  };

  // =============================================================================
  // ✅ BUG FIX: CHECK CHAT RESTRICTIONS MELHORADO COM LOGS
  // =============================================================================
  const canSendMessage = () => {
    // Se está morto, só pode falar no chat dos mortos
    if (!me.isAlive && activeTab !== 'dead') {
      console.log('🚫 ChatGigante: Dead player can only use dead chat', {
        userAlive: me.isAlive,
        activeTab
      });
      return false;
    }

    // Não pode enviar no canal do sistema
    if (activeTab === 'system') {
      console.log('🚫 ChatGigante: Cannot send to system channel');
      return false;
    }

    // Chat de lobisomens só para lobisomens
    if (activeTab === 'werewolf' && me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') {
      console.log('🚫 ChatGigante: Not a werewolf - cannot use werewolf chat', {
        userRole: me.role,
        activeTab
      });
      return false;
    }

    // ✅ BUG FIX: Durante a noite, só lobisomens podem falar no público
    if (gameState.phase === 'NIGHT' && activeTab === 'public' &&
      me.role !== 'WEREWOLF' && me.role !== 'WEREWOLF_KING') {
      console.log('🚫 ChatGigante: Night phase - only werewolves can use public chat', {
        gamePhase: gameState.phase,
        userRole: me.role,
        activeTab
      });
      return false;
    }

    console.log('✅ ChatGigante: Can send message', {
      activeTab,
      userAlive: me.isAlive,
      userRole: me.role,
      gamePhase: gameState?.phase
    });
    return true;
  };

  // =============================================================================
  // ✅ BUG FIX: SEND MESSAGE COM DEBUG DETALHADO E VERIFICAÇÕES
  // =============================================================================
  const handleSendMessage = async () => {
    if (!message.trim() || !gameState || isSubmitting) {
      console.log('❌ ChatGigante: Cannot send message:', {
        hasMessage: !!message.trim(),
        hasGameState: !!gameState,
        isSubmitting,
        messageLength: message.length
      });
      return;
    }

    // ✅ VERIFICAR RESTRIÇÕES ANTES DE ENVIAR
    if (!canSendMessage()) {
      console.log('❌ ChatGigante: Cannot send message - restrictions apply:', {
        activeTab,
        userAlive: me?.isAlive,
        userRole: me?.role,
        gamePhase: gameState?.phase
      });
      return;
    }

    setIsSubmitting(true);

    // ✅ LOG DETALHADO: Tentativa de envio
    console.log('📤 ChatGigante: Attempting to send message:', {
      message: message.trim(),
      channel: activeTab,
      gameState: !!gameState,
      userId: me?.userId,
      username: me?.username,
      gamePhase: gameState?.phase,
      timestamp: new Date().toISOString()
    });

    try {
      const success = sendMessage('chat-message', {
        message: message.trim(),
        channel: activeTab,
      });

      console.log('📤 ChatGigante: Message send result:', {
        success,
        message: message.trim(),
        channel: activeTab,
        socketConnected: !!sendMessage
      });

      if (success) {
        setMessage('');
        console.log('✅ ChatGigante: Message sent successfully, input cleared');
      } else {
        console.error('❌ ChatGigante: Failed to send message - sendMessage returned false');
      }
    } catch (error) {
      console.error('❌ ChatGigante: Error sending message:', error);
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
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-medieval-700 flex items-center justify-center">
            {isSystem ? '🤖' : isMe ? '👤' : '🧑'}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`font-semibold text-sm ${isMe ? 'text-blue-300' : isSystem ? 'text-amber-300' : 'text-white'}`}>
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

            <div className={`text-sm break-words ${isSystem ? 'text-amber-100' : 'text-white/90'}`}>
              {msg.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ LOG do estado atual do chat
  useEffect(() => {
    console.log('📊 ChatGigante: Current state summary:', {
      totalMessages: chatMessages.length, // ✅ CORRIGIDO: Usar chatMessages do estado central
      activeTab,
      gamePhase: gameState?.phase,
      userAlive: me?.isAlive,
      availableTabs,
      canSend: canSendMessage()
    });
  }, [chatMessages.length, activeTab, gameState?.phase, me?.isAlive]); // ✅ CORRIGIDO: Usar chatMessages

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
            const unreadCount = tab !== activeTab ? tabMessages.length : 0;

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
                  <span className="text-xs">({tabMessages.length})</span>
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
              {/* ✅ DEBUG: Mostrar contador total de mensagens */}
              <p className="text-xs mt-2 text-white/30">
                Debug: {chatMessages.length} mensagens total {/* ✅ CORRIGIDO */}
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

        {/* ✅ DEBUG INFO */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-white/30 text-center">
            Debug: {chatMessages.length} msgs total | Aba: {activeTab} ({getMessagesForTab(activeTab).length}) | {/* ✅ CORRIGIDO */}
            Pode enviar: {canSendMessage() ? 'Sim' : 'Não'} | Fase: {gameState?.phase}
          </div>
        )}
      </div>
    </div>
  );
}