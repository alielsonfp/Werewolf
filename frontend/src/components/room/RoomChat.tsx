import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';
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
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    onSendMessage(newMessage.trim());
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col h-96">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat da Sala
          {!isConnected && (
            <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded-full">
              Desconectado
            </span>
          )}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                ${message.channel === 'system'
                  ? 'text-center text-sm text-slate-400 italic'
                  : message.userId === currentUserId
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }
              `}
            >
              {message.channel === 'system' ? (
                <span>{message.message}</span>
              ) : (
                <div className={`
                  max-w-xs p-3 rounded-lg
                  ${message.userId === currentUserId
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-700 text-white rounded-bl-none'
                  }
                `}>
                  <div className="text-xs opacity-75 mb-1">
                    {message.username} • {formatTime(message.timestamp)}
                  </div>
                  <div className="break-words">{message.message}</div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {newMessage.length}/200 caracteres
        </div>
      </form>
    </div>
  );
}
