import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { ArrowLeft, Crown, Share, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Player, Room, ChatMessage } from '@/types';
import { toast } from 'react-hot-toast';

import PlayerList from './PlayerList';
import RoomChat from './RoomChat';
import ActionButtons from './ActionButtons';
import { ConfirmModal } from '@/components/common/Modal';

interface WaitingRoomProps {
  roomId: string;
}

export default function WaitingRoom({ roomId }: WaitingRoomProps) {
  const router = useRouter();
  const { user, getToken, isAuthenticated } = useAuth();
  const { connect, disconnect, sendMessage, isConnected } = useSocket();

  // Estado da sala
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ NOVO: Estado para modal de confirmação de saída do host
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const currentUserId = user?.id || '';
  const isHost = room?.hostId === currentUserId;
  const currentPlayer = players.find(p => p.userId === currentUserId);
  const isReady = currentPlayer?.isReady || false;

  const canStartGame = players.length >= 3 &&
    players.every(p => p.isReady) &&
    isConnected &&
    isHost;

  // ✅ CORRIGIDO: Conectar ao WebSocket com dependências estáveis e verificações adequadas
  useEffect(() => {
    // ✅ Aguardar router estar pronto e autenticação
    if (!router.isReady || !isAuthenticated || !roomId) {
      console.log('⚠️ Waiting for router/auth to be ready', {
        routerReady: router.isReady,
        isAuthenticated,
        roomId
      });
      return;
    }

    const token = getToken();
    if (!token) {
      console.error('❌ No auth token available');
      router.push('/auth/login');
      return;
    }

    // Construir URL do WebSocket
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const wsUrl = `${wsBase}/ws/${roomId}?token=${encodeURIComponent(token)}`;

    console.log('🎮 Initiating connection to room:', roomId);

    // ✅ Conectar ao WebSocket
    connect(wsUrl);

    // ✅ Cleanup apropriado - só executa quando componente realmente desmonta
    return () => {
      console.log('🎮 Cleaning up connection for room:', roomId);
      disconnect();
    };
  }, [router.isReady, roomId, isAuthenticated, getToken]); // ✅ Dependências estáveis

  // ✅ CORRIGIDO: Enviar join-room após conexão estabelecida
  useEffect(() => {
    if (isConnected && roomId) {
      console.log('📤 Sending join-room message');
      sendMessage('join-room', { roomId });
    }
  }, [isConnected, roomId, sendMessage]);

  // Escutar mensagens do WebSocket
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const { type, data } = event.detail;
      console.log('📨 Received:', type, data);

      switch (type) {
        case 'room-joined':
          setRoom(data.room);
          // ✅ CORRIGIDO: Garantir que players e spectators sejam arrays válidos
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSpectators(Array.isArray(data.spectators) ? data.spectators : []);
          setLoading(false);
          toast.success(`Entrou na sala: ${data.room?.name || roomId}`);
          break;

        case 'player-joined':
          if (data.player) {
            setPlayers(prev => {
              // ✅ Evitar duplicatas
              const filtered = prev.filter(p => p.userId !== data.player.userId);
              return [...filtered, data.player];
            });

            // Adicionar mensagem do sistema
            const systemMessage: ChatMessage = {
              id: Date.now().toString(),
              userId: 'system',
              username: 'Sistema',
              message: `${data.player.username} entrou na sala`,
              channel: 'system',
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, systemMessage]);
          }
          break;

        case 'player-left':
          if (data.userId) {
            setPlayers(prev => prev.filter(p => p.userId !== data.userId));
            setSpectators(prev => prev.filter(s => s.userId !== data.userId));

            if (data.username) {
              const systemMessage: ChatMessage = {
                id: Date.now().toString(),
                userId: 'system',
                username: 'Sistema',
                message: `${data.username} saiu da sala`,
                channel: 'system',
                timestamp: new Date().toISOString()
              };
              setMessages(prev => [...prev, systemMessage]);
            }
          }
          break;

        case 'player-ready':
          if (data.userId) {
            setPlayers(prev => prev.map(p =>
              p.userId === data.userId ? { ...p, isReady: data.ready } : p
            ));
          }
          break;

        case 'chat-message':
          if (data) {
            const message = data.message || data;
            setMessages(prev => [...prev, message]);
          }
          break;

        case 'game-starting':
        case 'game-started':
          toast.success('🎮 Jogo iniciando!');
          setTimeout(() => {
            router.push(`/game/${roomId}`);
          }, 2000);
          break;

        case 'room-updated':
          if (data.room) setRoom(data.room);
          if (data.players) setPlayers(data.players);
          if (data.spectators) setSpectators(data.spectators);
          break;

        // ✅ NOVO: Evento de sala deletada
        case 'room-deleted':
          toast.info('Sala foi encerrada pelo host');
          router.push('/lobby');
          break;

        case 'error':
          if (data.message) {
            toast.error(data.message);
          }
          break;
      }
    };

    window.addEventListener('websocket-message', handleMessage as EventListener);
    return () => {
      window.removeEventListener('websocket-message', handleMessage as EventListener);
    };
  }, [roomId, router]);

  // Handlers
  const handleToggleReady = () => {
    sendMessage('player-ready', { ready: !isReady });
  };

  const handleStartGame = () => {
    if (!isHost || !canStartGame) return;
    sendMessage('start-game', {});
    toast.success('Iniciando jogo...');
  };

  const handleKickPlayer = (playerId: string) => {
    if (!isHost) return;
    sendMessage('kick-player', { playerId });
  };

  const handleSendChatMessage = (message: string) => {
    sendMessage('chat-message', { message });
  };

  const handleShareRoom = async () => {
    if (!room) return;
    const shareUrl = `${window.location.origin}/room/${room.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link da sala copiado!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  // ✅ CORRIGIDO: Lógica de saída diferente para host vs jogadores
  const handleLeaveRoom = () => {
    if (isHost) {
      // Host precisa de confirmação
      setShowLeaveModal(true);
    } else {
      // Jogadores saem normalmente
      sendMessage('leave-room', { roomId });
      disconnect();
      router.push('/lobby');
    }
  };

  // ✅ NOVO: Confirmar encerramento da sala (apenas host)
  const handleConfirmLeaveAsHost = () => {
    sendMessage('delete-room', { roomId });
    // Não precisa chamar disconnect aqui - o backend vai kickar todos
    setShowLeaveModal(false);
    toast.info('Encerrando sala...');
    // O redirect vai acontecer quando recebermos 'room-deleted'
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🐺</div>
          <div className="text-xl text-white">Entrando na sala...</div>
          <div className="text-sm text-slate-400 mt-2">
            {isConnected ? 'Conectado' : 'Conectando...'}
          </div>
        </div>
      </div>
    );
  }

  // Se não tem dados da sala após o loading, mostra erro
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl text-white mb-4">Sala não encontrada</div>
          <Button
            variant="primary"
            onClick={() => router.push('/lobby')}
          >
            Voltar ao Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Header */}
        <div className="bg-slate-800/80 border-b border-slate-700 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLeaveRoom}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="text-3xl">🐺</div>

                <div>
                  <h1 className="text-2xl font-bold">{room.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Código: {room.code}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Host: {room.hostUsername}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {isConnected ? (
                        <span className="text-green-400">🟢 Conectado</span>
                      ) : (
                        <span className="text-red-400">🔴 Desconectado</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleShareRoom}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Share className="w-4 h-4" />
                  Compartilhar
                </button>

                <div className="text-right">
                  <div className="text-sm text-slate-400">Jogadores Prontos</div>
                  <div className="text-lg font-bold">
                    {players.filter(p => p.isReady).length}/{players.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List */}
            <div className="lg:col-span-2">
              <PlayerList
                players={players}
                spectators={spectators}
                currentUserId={currentUserId}
                isHost={isHost}
                onKickPlayer={handleKickPlayer}
                maxPlayers={room.maxPlayers}
                maxSpectators={room.maxSpectators}
              />
            </div>

            {/* Actions and Chat */}
            <div className="space-y-6">
              <ActionButtons
                isHost={isHost}
                isReady={isReady}
                canStartGame={canStartGame}
                isConnected={isConnected}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
              />

              <RoomChat
                messages={messages}
                onSendMessage={handleSendChatMessage}
                currentUserId={currentUserId}
                isConnected={isConnected}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOVO: Modal de confirmação para host sair */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleConfirmLeaveAsHost}
        title="Encerrar Sala"
        message="Você é o host desta sala. Ao sair, a sala será encerrada e todos os jogadores serão removidos. Deseja continuar?"
        confirmText="Sim, Encerrar Sala"
        cancelText="Cancelar"
        variant="warning"
      />
    </>
  );
}

// Componente Button temporário (você já tem um componente Button)
function Button({ variant, onClick, children, ...props }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors ${variant === 'primary'
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      {...props}
    >
      {children}
    </button>
  );
}