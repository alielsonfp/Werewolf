import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { ArrowLeft, Crown, Share } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Player, Room, ChatMessage } from '@/types';
import { toast } from 'react-hot-toast';

// Importar componentes específicos
import PlayerList from './PlayerList';
import RoomChat from './RoomChat';
import ActionButtons from './ActionButtons';

interface WaitingRoomProps {
  roomId: string;
}

export default function WaitingRoom({ roomId }: WaitingRoomProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Estados da sala
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // WebSocket connection
  const { socket, status, isConnected, pingLatency, sendMessage } = useWebSocket(roomId);

  // Dados do usuário atual
  const currentUserId = user?.id || '';
  const isHost = room?.hostId === currentUserId;
  const currentPlayer = players.find(p => p.userId === currentUserId);
  const isReady = currentPlayer?.isReady || false;

  // Verificar se pode iniciar o jogo
  const canStartGame = players.length >= 3 &&
    players.every(p => p.isReady) &&
    isConnected &&
    isHost;

  // Buscar dados iniciais da sala
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        // Aqui você faria a chamada para a API REST para buscar dados da sala
        // const response = await api.get(`/rooms/${roomId}`);

        // Por agora, dados mockados
        const mockRoom: Room = {
          id: roomId,
          name: 'Sala do Lobisomem',
          code: 'ABC123',
          isPrivate: false,
          maxPlayers: 12,
          maxSpectators: 8,
          currentPlayers: 0,
          currentSpectators: 0,
          status: 'WAITING',
          hostId: 'user-1',
          hostUsername: 'Host',
          canJoin: true,
          createdAt: new Date().toISOString(),
          settings: {
            gameMode: 'CLASSIC',
            timeDay: 300,
            timeNight: 120,
            timeVoting: 180,
            allowSpectators: true,
            autoStart: false
          }
        };

        setRoom(mockRoom);
        setLoading(false);

      } catch (error) {
        console.error('Failed to fetch room data:', error);
        toast.error('Erro ao carregar dados da sala');
        router.push('/lobby');
      }
    };

    if (roomId) {
      fetchRoomData();
    }
  }, [roomId, router]);

  // Escutar eventos do WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        switch (type) {
          case 'room-joined':
            // Atualizar estado da sala e lista de jogadores
            if (data.room) setRoom(data.room);
            if (data.players) setPlayers(data.players);
            console.log('✅ Successfully joined room');
            break;

          case 'player-joined':
            // Adicionar novo jogador
            if (data.player) {
              setPlayers(prev => [...prev, data.player]);
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                userId: 'system',
                username: 'Sistema',
                message: `${data.player.username} entrou na sala`,
                channel: 'system',
                timestamp: new Date().toISOString()
              }]);
            }
            break;

          case 'player-left':
            // Remover jogador
            if (data.userId) {
              setPlayers(prev => prev.filter(p => p.userId !== data.userId));
              setSpectators(prev => prev.filter(s => s.userId !== data.userId));
            }
            break;

          case 'player-ready':
            // Atualizar status ready do jogador
            if (data.userId !== undefined && data.ready !== undefined) {
              setPlayers(prev => prev.map(p =>
                p.userId === data.userId
                  ? { ...p, isReady: data.ready }
                  : p
              ));
            }
            break;

          case 'chat-message':
            // Nova mensagem no chat
            if (data.message) {
              setMessages(prev => [...prev, data.message]);
            }
            break;

          case 'game-starting':
            // Jogo está começando
            toast.success('🎮 Jogo iniciando!');
            setTimeout(() => {
              router.push(`/game/${roomId}`);
            }, 2000);
            break;

          case 'error':
            // Tratar erros do servidor
            console.error('Server error:', data);
            toast.error(data.message || 'Erro no servidor');
            break;

          default:
            console.log('Unhandled message type:', type);
        }
      } catch (error) {
        console.error('Failed to handle WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, router, roomId]);

  // Handlers de ação
  const handleToggleReady = () => {
    if (!sendMessage('player-ready', { ready: !isReady })) {
      toast.error('Erro ao atualizar status');
      return;
    }
  };

  const handleStartGame = () => {
    if (!isHost || !canStartGame) return;

    if (!sendMessage('start-game', {})) {
      toast.error('Erro ao iniciar jogo');
      return;
    }

    toast.success('Iniciando jogo...');
  };

  const handleKickPlayer = (playerId: string) => {
    if (!isHost) return;

    if (!sendMessage('kick-player', { playerId })) {
      toast.error('Erro ao expulsar jogador');
      return;
    }
  };

  const handleSendChatMessage = (message: string) => {
    if (!sendMessage('chat-message', { message })) {
      toast.error('Erro ao enviar mensagem');
      return;
    }
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

  const handleLeaveRoom = () => {
    sendMessage('leave-room', {});
    router.push('/lobby');
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🐺</div>
          <div className="text-xl text-white">Carregando sala...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header da Sala */}
      <div className="bg-slate-800/80 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeaveRoom}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Voltar ao lobby"
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
                    Status:
                    {isConnected ? (
                      <span className="text-green-400 ml-1">🟢 Conectado</span>
                    ) : (
                      <span className="text-red-400 ml-1">🔴 {status}</span>
                    )}
                  </span>
                  {isConnected && pingLatency > 0 && (
                    <>
                      <span>•</span>
                      <span>Ping: {pingLatency}ms</span>
                    </>
                  )}
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

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Jogadores */}
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

          {/* Chat e Ações */}
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
  );
}