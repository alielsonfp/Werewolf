import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

import CreateRoomModal from '@/components/lobby/CreateRoomModal';
import JoinRoomModal from '@/components/lobby/JoinRoomModal';

import { roomService, RoomListItem } from '@/services/roomService';

// ✅ CORREÇÃO: SafeNumberDisplay à prova de hidratação
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

// ✅ CORREÇÃO: Componente para data/hora seguro
interface SafeDateDisplayProps {
  date: string | Date;
  className?: string;
}

function SafeDateDisplay({ date, className = "" }: SafeDateDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>--:--</span>;
  }

  return (
    <span className={className}>
      {new Date(date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })}
    </span>
  );
}

// Ícones SVG
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

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8.586 6L5 10H3a1 1 0 00-1 1v2a1 1 0 001 1h2l3.586 4a1 1 0 001.414-1.414L8.586 6z" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586L12 12m0 0l6.414 6.414M12 12L5.586 18.414M12 12l6.414-6.414M8.586 6L5 10H3a1 1 0 00-1 1v2a1 1 0 001 1h2l3.586 4a1 1 0 001.414-1.414L8.586 6z" />
  </svg>
);

function LobbyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { isConnected } = useSocket();
  const { playSound, playMusic, stopMusic, getPhaseColors, getThemeClass } = useTheme();

  // ✅ Aplicar cores dinâmicas do tema
  const phaseColors = getPhaseColors();

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'WAITING' | 'PLAYING'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

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
      if (randomMusic) {
        playMusic(randomMusic);
        setIsMusicPlaying(true);
      }
      setMusicStarted(true);
    }
  }, [isAuthLoading, isAuthenticated, musicStarted, playMusic]);

  useEffect(() => {
    return () => {
      if (musicStarted) {
        console.log('🎵 Parando música do lobby...');
        stopMusic();
      }
    };
  }, [musicStarted, stopMusic]);

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

  const handleLogout = useCallback(() => {
    console.log('🚪 Logging out...');
    playSound('button_click');
    logout();
    router.push('/auth/login');
  }, [logout, router, playSound]);

  const toggleMusic = useCallback(() => {
    if (isMusicPlaying) {
      stopMusic();
      setIsMusicPlaying(false);
    } else {
      const musicOptions = ['medieval_tavern01', 'medieval_tavern02', 'medieval_tavern03'];
      const randomMusic = musicOptions[Math.floor(Math.random() * musicOptions.length)];
      if (randomMusic) {
        playMusic(randomMusic);
        setIsMusicPlaying(true);
      }
    }
    playSound('button_click');
  }, [isMusicPlaying, stopMusic, playMusic, playSound]);

  if (isAuthLoading) {
    return (
      <>
        <Head>
          <title>Lobby - Lobisomem Online</title>
        </Head>
        <div className={`min-h-screen transition-all duration-300 bg-gradient-to-br ${phaseColors.background} ${getThemeClass()}`}>
          <div className="flex justify-center items-center min-h-screen">
            <LoadingSpinner
              variant="medieval"
              size="xl"
              text="Verificando autenticação..."
            />
          </div>
        </div>
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

      <div className={`min-h-screen transition-all duration-300 bg-gradient-to-br ${phaseColors.background} ${getThemeClass()}`}>
        {/* Header Simplificado */}
        <header className="bg-medieval-800/50 border-b border-medieval-600 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo/Brand */}
              <div className="flex items-center">
                <h1 className="text-2xl font-medieval text-glow">
                  🐺 Werewolf Online
                </h1>
              </div>

              {/* User Info + Actions */}
              <div className="flex items-center gap-4">
                {/* User Info */}
                <div className="flex items-center gap-3 bg-medieval-700/50 rounded-lg px-4 py-2 border border-medieval-600">
                  <div className="w-8 h-8 bg-salem-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-white font-medium">
                    {user?.username || 'Jogador'}
                  </span>
                </div>

                {/* Music Toggle */}
                <Button
                  variant="ghost"
                  size="md"
                  onClick={toggleMusic}
                  className="text-white hover:text-salem-400"
                  {...{ title: isMusicPlaying ? 'Desligar música' : 'Ligar música' } as any}
                >
                  {isMusicPlaying ? <VolumeIcon /> : <VolumeOffIcon />}
                </Button>

                {/* Logout */}
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogoutIcon />
                  <span>Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-3xl font-medieval text-glow mb-4">
                🏘️ Lobby Principal
              </h2>
              <p className="text-white/70 text-lg">
                Bem-vindo de volta, {user?.username || 'Jogador'}! Encontre uma partida ou crie sua própria sala.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button
                variant="medieval"
                size="lg"
                onClick={handleCreateRoom}
                className="min-w-[200px]"
              >
                <PlusIcon />
                <span>Criar Sala</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleJoinByCode}
                className="min-w-[200px]"
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

            {/* Search and Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto"
            >
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
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

            {/* Rooms List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-6xl mx-auto"
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
        </main>

        {/* Modals */}
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        <JoinRoomModal
          isOpen={showJoinCodeModal}
          onClose={() => setShowJoinCodeModal(false)}
        />
      </div>
    </>
  );
}

// Room Card Component
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
              <SafeDateDisplay date={room.createdAt} />
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