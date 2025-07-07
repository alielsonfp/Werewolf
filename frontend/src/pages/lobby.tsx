import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/context/ThemeContext';
import Layout from '@/components/common/Layout';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

import CreateRoomModal from '@/components/lobby/CreateRoomModal';
import JoinRoomModal from '@/components/lobby/JoinRoomModal';

import { roomService, RoomListItem } from '@/services/roomService';

interface SafeNumberDisplayProps {
  value: number;
  className?: string;
}

function SafeNumberDisplay({ value, className = "" }: SafeNumberDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={className}>
      {value.toLocaleString('pt-BR')}
    </span>
  );
}

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a4 4 0 008 0v-4M9 10V9a4 4 0 118 0v1M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

function LobbyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isConnected } = useSocket();
  const { playSound, playMusic, stopMusic } = useTheme();

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'WAITING' | 'PLAYING'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && !musicStarted) {
      console.log('🎵 Iniciando música do lobby...');
      const musicOptions = ['medieval_tavern01', 'medieval_tavern02', 'medieval_tavern03'];
      const randomMusic = musicOptions[Math.floor(Math.random() * musicOptions.length)];
      playMusic(randomMusic);
      setMusicStarted(true);
    }
  }, [isAuthLoading, isAuthenticated, musicStarted]);

  useEffect(() => {
    return () => {
      if (musicStarted) {
        console.log('🎵 Parando música do lobby...');
        stopMusic();
      }
    };
  }, [musicStarted]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const roomsList = await roomService.listPublicRooms();
      setRooms(roomsList);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    fetchRooms();
  }, [isAuthLoading, isAuthenticated, fetchRooms]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchRooms();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthLoading, isAuthenticated, fetchRooms]);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.hostUsername.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || room.status === filterStatus;
    return matchesSearch && matchesFilter && !room.isPrivate;
  });

  const handleJoinRoom = useCallback((roomId: string) => {
    console.log('🚪 Joining room:', roomId);
    playSound('button_click');
    router.push(`/room/${roomId}`);
  }, [router, playSound]);

  const handleSpectateRoom = useCallback((roomId: string) => {
    console.log('👁️ Spectating room:', roomId);
    playSound('button_click');
    router.push(`/room/${roomId}?spectate=true`);
  }, [router, playSound]);

  const handleCreateRoom = useCallback(() => {
    console.log('🏗️ Opening create room modal');
    playSound('button_click');
    setShowCreateModal(true);
  }, [playSound]);

  const handleJoinByCode = useCallback(() => {
    console.log('🔑 Opening join by code modal');
    playSound('button_click');
    setShowJoinCodeModal(true);
  }, [playSound]);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing room list');
    playSound('button_click');
    fetchRooms();
  }, [playSound, fetchRooms]);

  if (isAuthLoading) {
    return (
      <>
        <Head>
          <title>Lobby - Lobisomem Online</title>
        </Head>
        <Layout>
          <div className="flex justify-center items-center min-h-[50vh]">
            <LoadingSpinner
              variant="medieval"
              size="xl"
              text="Verificando autenticação..."
            />
          </div>
        </Layout>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Lobby - Werewolf</title>
        <meta name="description" content="Encontre e participe de partidas de Werewolf" />
      </Head>

      <Layout>
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
          >
            <div>
              <h1 className="text-3xl font-medieval text-glow">
                🏘️ Lobby Principal
              </h1>
              <p className="text-white/70 mt-2">
                Bem-vindo de volta, {user?.username || 'Jogador'}! Encontre uma partida ou crie sua própria sala.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isConnected
                ? 'bg-green-900/30 text-green-300 border border-green-500/30'
                : 'bg-red-900/30 text-red-300 border border-red-500/30'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                {isConnected ? 'Online' : 'Desconectado'}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            <Button
              variant="medieval"
              size="lg"
              onClick={handleCreateRoom}
              className="flex-1 min-w-[200px]"
            >
              <PlusIcon />
              <span>Criar Sala</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleJoinByCode}
              className="flex-1 min-w-[200px]"
            >
              <HashIcon />
              <span>Entrar por Código</span>
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshIcon />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar salas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-medieval-800/50 border border-medieval-600 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-salem-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              {(['ALL', 'WAITING', 'PLAYING'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={filterStatus === filter ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setFilterStatus(filter)}
                >
                  {filter === 'ALL' ? 'Todas' : filter === 'WAITING' ? 'Aguardando' : 'Em Jogo'}
                </Button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner variant="medieval" size="lg" text="Carregando salas..." />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room, index) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onJoin={() => handleJoinRoom(room.id)}
                      onSpectate={() => handleSpectateRoom(room.id)}
                      delay={index * 0.05}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-white/60"
                  >
                    <div className="text-6xl mb-4">🏚️</div>
                    <h3 className="text-xl font-semibold mb-2">Nenhuma sala encontrada</h3>
                    <p>Tente ajustar os filtros ou criar uma nova sala.</p>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        <JoinRoomModal
          isOpen={showJoinCodeModal}
          onClose={() => setShowJoinCodeModal(false)}
        />
      </Layout>
    </>
  );
}

interface RoomCardProps {
  room: RoomListItem;
  onJoin: () => void;
  onSpectate: () => void;
  delay?: number;
}

function RoomCard({ room, onJoin, onSpectate, delay = 0 }: RoomCardProps) {
  const canJoin = room.status === 'WAITING' && room.currentPlayers < room.maxPlayers;
  const canSpectate = room.currentSpectators < room.maxSpectators;

  const getStatusColor = () => {
    switch (room.status) {
      case 'WAITING': return 'text-green-400 bg-green-900/30 border-green-500/30';
      case 'PLAYING': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      case 'FINISHED': return 'text-gray-400 bg-gray-900/30 border-gray-500/30';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 'WAITING': return 'Aguardando';
      case 'PLAYING': return 'Em Jogo';
      case 'FINISHED': return 'Finalizada';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      className="bg-medieval-800/30 border border-medieval-600 rounded-lg p-4 hover:border-salem-500/50 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white truncate">{room.name}</h3>

            {room.isPrivate && (
              <span className="text-yellow-400">🔒</span>
            )}

            <div className={`px-2 py-1 rounded text-xs border ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            <div className="flex items-center gap-1">
              <UsersIcon />
              <span>
                <SafeNumberDisplay value={room.currentPlayers} />
                /
                <SafeNumberDisplay value={room.maxPlayers} />
              </span>
            </div>

            <div className="flex items-center gap-1">
              <EyeIcon />
              <span>
                <SafeNumberDisplay value={room.currentSpectators} />
                /
                <SafeNumberDisplay value={room.maxSpectators} />
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span>Host: {room.hostUsername}</span>
            </div>

            <div className="flex items-center gap-1">
              <ClockIcon />
              <span>{new Date(room.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          {canSpectate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSpectate}
            >
              <EyeIcon />
            </Button>
          )}

          <Button
            variant={canJoin ? 'primary' : 'secondary'}
            size="sm"
            onClick={onJoin}
            disabled={!canJoin && !canSpectate}
          >
            <PlayIcon />
            <span>
              {canJoin ? 'Entrar' : room.status === 'PLAYING' ? 'Assistir' : 'Lotada'}
            </span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default LobbyPage;