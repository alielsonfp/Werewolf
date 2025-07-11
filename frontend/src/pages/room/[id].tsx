import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState, useMemo, useRef } from 'react'; // ✅ ADICIONADO useRef
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

  // ✅ ADICIONADO: REF PARA PREVENIR DOUBLE SEND
  const joinAttemptRef = useRef<string | null>(null);

  // ✅ TODOS OS ESTADOS AGORA VIVEM AQUI (REMOVIDO spectators)
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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

  // ✅ EFEITO #1: Apenas para conectar e desconectar ao WebSocket.
  useEffect(() => {
    console.log('🚪 [FE-ROOM] useEffect de conexão disparado!', {
      isReady: router.isReady,
      isAuthenticated,
      roomId,
      isConnected,
      roomIdType: typeof roomId,
      timestamp: new Date().toISOString()
    });

    if (!router.isReady || !isAuthenticated || !roomId || typeof roomId !== 'string') {
      console.log('🚪 [FE-ROOM] Condições de conexão não atendidas, saindo do efeito.', {
        routerReady: router.isReady,
        authenticated: isAuthenticated,
        hasRoomId: !!roomId,
        roomIdType: typeof roomId
      });
      return;
    }

    const token = getToken();
    if (!token) {
      console.log('🚪 [FE-ROOM] Token não encontrado, redirecionando para login');
      router.push('/auth/login');
      return;
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/${roomId}?token=${encodeURIComponent(token)}`;

    console.log('🔌 [FE-ROOM] TENTANDO CONECTAR...', {
      url: wsUrl,
      isConnected,
      currentRoomId: roomId
    });

    connect(wsUrl);

    return () => {
      console.log('🚪 [FE-ROOM] useEffect de conexão está sendo LIMPO (cleanup). Desconectando...');
      sendMessage('leave-room', { roomId });
      disconnect();
    };
  }, [router.isReady, isAuthenticated, roomId, connect, disconnect, getToken, router, sendMessage]);

  // ✅ EFEITO #2: CORRIGIDO - Previne double send (REMOVIDO spectate)
  useEffect(() => {
    console.log('🔄 [FE-ROOM] useEffect join-room disparado', {
      isConnected,
      hasJoinedRoom,
      roomId,
      joinAttemptCurrent: joinAttemptRef.current,
      timestamp: new Date().toISOString()
    });

    if (isConnected && !hasJoinedRoom && roomId) {
      // ✅ PREVENIR MULTIPLE SENDS PARA A MESMA SALA
      if (joinAttemptRef.current === roomId) {
        console.log('🚫 [FE-ROOM] Join já tentado para esta sala, ignorando');
        return;
      }

      console.log('📤 [FE-ROOM] Enviando join-room', {
        roomId,
        timestamp: new Date().toISOString()
      });

      if (sendMessage('join-room', { roomId: roomId as string, asSpectator: false })) {
        joinAttemptRef.current = roomId as string; // Marcar tentativa
        setHasJoinedRoom(true);
        console.log('✅ [FE-ROOM] join-room enviado, marcando hasJoinedRoom=true');
      } else {
        console.log('❌ [FE-ROOM] Falha ao enviar join-room');
      }
    }
  }, [isConnected, roomId, hasJoinedRoom, sendMessage]);

  // ✅ EFEITO #3: Apenas para ouvir as mensagens. (REMOVIDO spectators)
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const { type, data } = event.detail;
      console.log('📨 [FE-ROOM] Received:', type, data);

      switch (type) {
        case 'room-joined':
          console.log('📨 [FE-ROOM] room-joined recebido', {
            room: data.room?.name,
            playersCount: data.players?.length
          });
          setRoom(data.room);
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setLoading(false);
          toast.success(`Entrou na sala: ${data.room?.name || roomId}`);
          break;

        case 'player-joined':
          console.log('📨 [FE-ROOM] player-joined recebido', {
            player: data.player,
            currentPlayersCount: players.length
          });
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
        case 'game-state':
          const gameId = data?.gameId || `game-${roomId}`;

          console.log('🎮 [FE-ROOM] Game starting/started:', {
            type,
            gameId,
            roomId,
            dataReceived: data
          });

          toast.success('🎮 Jogo iniciando!');
          disconnect();
          router.push(`/game/${gameId}`);
          break;

        case 'room-updated':
          if (data.room) setRoom(data.room);
          if (data.players) setPlayers(data.players);
          break;

        case 'room-deleted':
          //toast.error(data.reason || 'A sala foi encerrada pelo host');
          router.push('/lobby');
          break;

        case 'error':
          if (data.message) {
            //toast.error(data.message);
          }
          break;
      }
    };

    window.addEventListener('websocket-message', handleMessage as EventListener);
    return () => {
      window.removeEventListener('websocket-message', handleMessage as EventListener);
    };
  }, [roomId, router, disconnect, players.length]);

  // ✅ HANDLERS (REMOVIDO handleShareRoom)
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

  return (
    <>
      <Head>
        <title>{room?.name || 'Sala'} - Lobisomem Online</title>
        <meta name="description" content="Aguardando jogadores para começar a partida" />
      </Head>

      <WaitingRoom
        roomId={roomId as string}
        room={room}
        players={players}
        spectators={[]} // ✅ Array vazio - não vai mostrar espectadores
        messages={messages}
        currentUserId={currentUserId}
        isHost={isHost}
        isReady={isReady}
        canStartGame={canStartGame}
        isConnected={isConnected}
        showLeaveModal={showLeaveModal}
        setShowLeaveModal={setShowLeaveModal}
        onToggleReady={handleToggleReady}
        onStartGame={handleStartGame}
        onKickPlayer={handleKickPlayer}
        onSendChatMessage={handleSendChatMessage}
        onShareRoom={() => { }} // ✅ Função vazia - botão não vai funcionar
        onLeaveRoom={handleLeaveRoom}
        onConfirmLeaveAsHost={handleConfirmLeaveAsHost}
      />
    </>
  );
}

export default withAuth(RoomPage);