import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState, useMemo, useRef } from 'react';
import { withAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import WaitingRoom from '@/components/room/WaitingRoom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { Player, Room, ChatMessage } from '@/types';

function RoomPage() {
  const router = useRouter();
  const { id: roomId } = router.query;
  const { connect, disconnect, isConnected, sendMessage } = useSocket();
  const { user, getToken, isAuthenticated } = useAuth();

  // ✅ CONTROLE DE EXECUÇÃO ÚNICA
  const didConnectRef = useRef(false);

  // ✅ TODOS OS ESTADOS AGORA VIVEM AQUI
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [connectionConfirmed, setConnectionConfirmed] = useState(false); // 🚨 NOVO: Aguardar confirmação
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // ✅ DADOS DERIVADOS
  const currentUserId = user?.id || '';
  const isHost = useMemo(() => room?.hostId === currentUserId, [room, currentUserId]);
  const currentPlayer = useMemo(() => players.find(p => p.userId === currentUserId), [players, currentUserId]);
  const isReady = currentPlayer?.isReady || false;

  // ✅ CORRIGIDO: Bug #1 - Filtrar host antes de verificar se todos estão prontos
  const canStartGame = players.length >= 3 && players.filter(p => !p.isHost).every(p => p.isReady) && isConnected && isHost;

  // ✅ EFEITO #1: Conectar UMA VEZ APENAS
  useEffect(() => {
    if (!router.isReady || !isAuthenticated || !roomId || typeof roomId !== 'string') {
      return;
    }

    // 🎯 PROTEÇÃO CONTRA MÚLTIPLAS EXECUÇÕES
    if (didConnectRef.current) {
      return;
    }
    didConnectRef.current = true;

    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${roomId}?token=${encodeURIComponent(token)}`;
    connect(wsUrl);

    return () => {
      sendMessage('leave-room', { roomId });
      disconnect();
      didConnectRef.current = false; // Reset para próxima montagem
    };
  }, [router.isReady, isAuthenticated, roomId]); // 🎯 DEPENDÊNCIAS MÍNIMAS

  // 🚨 EFEITO #2: Aguardar confirmação de conexão antes de join-room
  useEffect(() => {
    if (isConnected && connectionConfirmed && !hasJoinedRoom && roomId) {
      console.log('📤 Sending join-room after connection confirmed');
      const asSpectator = router.query.spectate === 'true';

      if (sendMessage('join-room', { roomId: roomId as string, asSpectator })) {
        setHasJoinedRoom(true);
        console.log('✅ Join-room sent successfully');
      }
    }
  }, [isConnected, connectionConfirmed, hasJoinedRoom, roomId]); // 🎯 DEPENDÊNCIAS MÍNIMAS

  // ✅ EFEITO #3: Apenas para ouvir as mensagens.
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const { type, data } = event.detail;
      console.log('📨 [RoomPage] Received:', type, data);

      switch (type) {
        case 'connected': // 🚨 NOVO: Escutar confirmação de conexão
          console.log('✅ WebSocket connection confirmed');
          setConnectionConfirmed(true);
          break;

        case 'room-joined':
          setRoom(data.room);
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSpectators(Array.isArray(data.spectators) ? data.spectators : []);
          setLoading(false);
          toast.success(`Entrou na sala: ${data.room?.name || roomId}`);
          break;

        case 'player-joined':
          if (data.player) {
            setPlayers(prev => {
              const filtered = prev.filter(p => p.userId !== data.player.userId);
              return [...filtered, data.player];
            });

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

        // ✅ CORRIGIDO: Bug #2 - Redirecionamento para tela do jogo
        case 'game-starting':
        case 'game-started':
        case 'game-state': // ✅ ADICIONADO: Ouvir também game-state do backend
          // ✅ CORRIGIDO: Identificar gameId correto (backend gera "game-${roomId}")
          const gameId = data?.gameId || `game-${roomId}`;

          console.log('🎮 [RoomPage] Game starting/started:', {
            type,
            gameId,
            roomId,
            dataReceived: data
          });

          toast.success('🎮 Jogo iniciando!');

          // ✅ CORRIGIDO: Desconectar WebSocket da sala antes de navegar
          disconnect();

          // ✅ CORRIGIDO: Redirecionar imediatamente (sem setTimeout)
          router.push(`/game/${gameId}`);
          break;

        case 'room-updated':
          if (data.room) setRoom(data.room);
          if (data.players) setPlayers(data.players);
          if (data.spectators) setSpectators(data.spectators);
          break;

        case 'room-deleted':
          toast.error(data.reason || 'A sala foi encerrada pelo host');
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
  }, [roomId, router, disconnect]);

  // ✅ HANDLERS (MOVIDOS DO WAITINGROOM)
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

  const handleLeaveRoom = () => {
    if (isHost) {
      setShowLeaveModal(true);
    } else {
      sendMessage('leave-room', { roomId });
      router.push('/lobby');
    }
  };

  const handleConfirmLeaveAsHost = () => {
    sendMessage('delete-room', { roomId });
    setShowLeaveModal(false);
    toast('Encerrando sala...', { icon: '🏠' });
  };

  // ✅ RENDERIZAÇÃO CONDICIONAL
  if (!router.isReady) {
    return (
      <>
        <Head>
          <title>Carregando... - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <LoadingSpinner variant="medieval" size="xl" text="Carregando sala..." />
        </div>
      </>
    );
  }

  if (!roomId || typeof roomId !== 'string') {
    return (
      <>
        <Head>
          <title>Erro - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Sala Inválida</h1>
            <button
              onClick={() => router.push('/lobby')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Voltar ao Lobby
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Head>
          <title>Conectando... - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner variant="medieval" size="xl" text="Conectando ao servidor..." />
            <p className="text-gray-400 mt-4">Estabelecendo conexão segura...</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Entrando na sala... - Lobisomem Online</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner variant="medieval" size="xl" text="Entrando na sala..." />
            <p className="text-gray-400 mt-4">Aguardando confirmação do servidor...</p>
          </div>
        </div>
      </>
    );
  }

  // ✅ RENDERIZA O WAITINGROOM PASSANDO TUDO COMO PROPS
  return (
    <>
      <Head>
        <title>{room?.name || 'Sala'} - Lobisomem Online</title>
        <meta name="description" content="Aguardando jogadores para começar a partida" />
      </Head>

      <WaitingRoom
        // IDs e dados básicos
        roomId={roomId as string}
        room={room}
        players={players}
        spectators={spectators}
        messages={messages}

        // Estados do usuário
        currentUserId={currentUserId}
        isHost={isHost}
        isReady={isReady}
        canStartGame={canStartGame}
        isConnected={isConnected}

        // Modal states
        showLeaveModal={showLeaveModal}
        setShowLeaveModal={setShowLeaveModal}

        // Handlers
        onToggleReady={handleToggleReady}
        onStartGame={handleStartGame}
        onKickPlayer={handleKickPlayer}
        onSendChatMessage={handleSendChatMessage}
        onShareRoom={handleShareRoom}
        onLeaveRoom={handleLeaveRoom}
        onConfirmLeaveAsHost={handleConfirmLeaveAsHost}
      />
    </>
  );
}

export default withAuth(RoomPage);