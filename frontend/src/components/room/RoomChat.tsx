import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, AlertCircle } from 'lucide-react';
import { ChatMessage } from '@/types';

interface RoomChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
  isConnected: boolean;
}

export default function RoomChat({
  messages,
  onSendMessage,
  currentUserId,
  isConnected
}: RoomChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;
    if (!isConnected) {
      console.warn('Cannot send message - not connected');
      return;
    }

    onSendMessage(inputMessage.trim());
    setInputMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const getMessageTypeStyle = (channel: string) => {
    switch (channel) {
      case 'system':
        return 'bg-yellow-600/20 border-yellow-600/30 text-yellow-200';
      case 'werewolf':
        return 'bg-red-600/20 border-red-600/30 text-red-200';
      case 'dead':
        return 'bg-gray-600/20 border-gray-600/30 text-gray-300';
      case 'spectator':
        return 'bg-purple-600/20 border-purple-600/30 text-purple-200';
      default:
        return 'bg-slate-700/50 border-slate-600/50 text-white';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat da Sala
          {!isConnected && (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
        </h3>
        {!isConnected && (
          <p className="text-xs text-red-400 mt-1">
            Desconectado - Não é possível enviar mensagens
          </p>
        )}
      </div>

      {/* ✅ CORRIGIDO: Área de mensagens com altura flexível e melhor layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-lg border ${getMessageTypeStyle(message.channel)}`}
              >
                {message.channel === 'system' ? (
                  <div className="text-center">
                    <span className="text-sm font-medium">
                      {message.message}
                    </span>
                    <div className="text-xs opacity-60 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {message.username}
                        {message.userId === currentUserId && (
                          <span className="text-xs opacity-60 ml-1">(Você)</span>
                        )}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {message.message}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma mensagem ainda...</p>
              <p className="text-xs opacity-60">Seja o primeiro a conversar!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ✅ CORRIGIDO: Input fixo na parte inferior */}
        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
              disabled={!isConnected}
              className={`
                flex-1 px-3 py-2 rounded-lg border text-sm
                ${isConnected
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'bg-slate-800 border-slate-700 text-slate-500 placeholder-slate-600 cursor-not-allowed'
                }
                transition-colors outline-none
              `}
              maxLength={500}
            />
            <motion.button
              type="submit"
              disabled={!isConnected || !inputMessage.trim()}
              whileHover={isConnected && inputMessage.trim() ? { scale: 1.05 } : {}}
              whileTap={isConnected && inputMessage.trim() ? { scale: 0.95 } : {}}
              className={`
                px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                ${isConnected && inputMessage.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </motion.button>
          </form>

          {/* Character count */}
          {inputMessage.length > 400 && (
            <div className="mt-2 text-right">
              <span className={`text-xs ${inputMessage.length > 480 ? 'text-red-400' : 'text-yellow-400'}`}>
                {inputMessage.length}/500
              </span>
            </div>
          )}

          {/* Connection status indicator */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Desconectado
                </span>
              )}
            </span>

            {messages.length > 0 && (
              <span>{messages.length} mensagem{messages.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}