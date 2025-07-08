import React, { useState, useEffect } from 'react';
import type { GameState, Player, GamePhase } from '@/types';

// =============================================================================
// MOCK DATA COMPLETO
// =============================================================================
const createMockPlayer = (id: string, userId: string, username: string, role: string, isAlive = true, isHost = false): Player => ({
  id,
  userId,
  username,
  isHost,
  isReady: true,
  isSpectator: false,
  isConnected: true,
  joinedAt: new Date(),
  lastSeen: new Date(),
  isAlive,
  role: role as any,
  faction: role === 'WEREWOLF' || role === 'WEREWOLF_KING' ? 'WEREWOLF' :
    role === 'JESTER' || role === 'SERIAL_KILLER' ? 'NEUTRAL' : 'TOWN',
  hasActed: false,
  hasVoted: false,
  isProtected: false,
});

const MOCK_PLAYERS: Player[] = [
  createMockPlayer('1', 'user1', 'João Silva', 'SHERIFF', true, true),
  createMockPlayer('2', 'user2', 'Maria Santos', 'DOCTOR', true, false),
  createMockPlayer('3', 'user3', 'Pedro Oliveira', 'WEREWOLF', true, false),
  createMockPlayer('4', 'user4', 'Ana Costa', 'VILLAGER', true, false),
  createMockPlayer('5', 'user5', 'Carlos Lima', 'VIGILANTE', true, false),
  createMockPlayer('6', 'user6', 'Sofia Alves', 'WEREWOLF_KING', false, false), // Morta
  createMockPlayer('7', 'user7', 'Lucas Pereira', 'VILLAGER', true, false),
  createMockPlayer('8', 'user8', 'Julia Martins', 'JESTER', true, false),
  createMockPlayer('9', 'user9', 'Rafael Costa', 'SERIAL_KILLER', true, false),
];

const createMockGameState = (phase: GamePhase, day: number): GameState => ({
  gameId: 'mock-game-123',
  roomId: 'mock-room-123',
  status: 'PLAYING',
  phase,
  day,
  phaseStartTime: new Date(),
  phaseEndTime: new Date(Date.now() + 120000), // 2 minutos
  timeLeft: 120000,
  players: MOCK_PLAYERS,
  spectators: ['spectator1', 'spectator2'],
  eliminatedPlayers: MOCK_PLAYERS.filter(p => !p.isAlive),
  hostId: 'user1',
  events: [
    {
      id: '1',
      type: 'GAME_STARTED',
      phase: 'LOBBY',
      day: 0,
      timestamp: new Date(),
      data: { message: 'O jogo começou!' }
    },
    {
      id: '2',
      type: 'PHASE_CHANGED',
      phase: 'NIGHT',
      day: 1,
      timestamp: new Date(),
      data: { phase: 'NIGHT', day: 1 }
    },
    {
      id: '3',
      type: 'PLAYER_DIED',
      phase: 'DAY',
      day: 2,
      timestamp: new Date(),
      data: { playerId: '6', playerName: 'Sofia Alves', role: 'WEREWOLF_KING', cause: 'NIGHT_KILL' }
    }
  ],
  votes: phase === 'VOTING' ? {
    'user1': '3', // João vota em Pedro
    'user2': '3', // Maria vota em Pedro
    'user4': '8', // Ana vota em Julia
    'user7': '3', // Lucas vota em Pedro
  } : {},
  nightActions: [],
  config: {
    roomId: 'mock-room-123',
    maxPlayers: 15,
    maxSpectators: 5,
    nightDuration: 60000,
    dayDuration: 120000,
    votingDuration: 60000,
    allowReconnection: true,
    reconnectionTimeout: 120000,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
});

// =============================================================================
// MOCK GAME CONTEXT
// =============================================================================
const MockGameContext = React.createContext<any>(null);

const MockGameProvider = ({ children, gameState }: { children: React.ReactNode; gameState: GameState }) => {
  const me = gameState.players.find(p => p.userId === 'user1'); // João (Sheriff)
  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);

  const contextValue = {
    gameState,
    me,
    alivePlayers,
    deadPlayers,
    isMyTurn: gameState.phase === 'NIGHT' && me?.role === 'SHERIFF' && !me.hasActed,
    canVote: gameState.phase === 'VOTING' && me?.isAlive && !me.hasVoted,
    canAct: gameState.phase === 'NIGHT' && me?.isAlive && !me.hasActed && (me?.role === 'SHERIFF' || me?.role === 'DOCTOR'),
    isLoading: false,
    error: null,
    connectionStatus: 'connected' as const,
  };

  return (
    <MockGameContext.Provider value={contextValue}>
      {children}
    </MockGameContext.Provider>
  );
};

const useGame = () => {
  const context = React.useContext(MockGameContext);
  if (!context) throw new Error('useGame must be used within MockGameProvider');
  return context;
};

// =============================================================================
// MOCK SOCKET CONTEXT
// =============================================================================
const MockSocketContext = React.createContext<any>(null);

const MockSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const contextValue = {
    isConnected: true,
    sendMessage: (type: string, data?: any) => {
      console.log('🎮 MOCK: Sending message:', type, data);
      return true;
    },
  };

  return (
    <MockSocketContext.Provider value={contextValue}>
      {children}
    </MockSocketContext.Provider>
  );
};

const useSocket = () => {
  const context = React.useContext(MockSocketContext);
  if (!context) throw new Error('useSocket must be used within MockSocketProvider');
  return context;
};

// =============================================================================
// MOCK COMPONENTS (SIMPLIFIED VERSIONS)
// =============================================================================

// Phase Indicator
const MockPhaseIndicator = ({ phase, day }: { phase: GamePhase; day: number }) => {
  const PHASE_CONFIG = {
    NIGHT: { icon: '🌙', name: 'Noite', bgColor: 'bg-blue-900', textColor: 'text-blue-200', borderColor: 'border-blue-700' },
    DAY: { icon: '☀️', name: 'Dia', bgColor: 'bg-amber-700', textColor: 'text-amber-200', borderColor: 'border-amber-600' },
    VOTING: { icon: '🗳️', name: 'Votação', bgColor: 'bg-red-800', textColor: 'text-red-200', borderColor: 'border-red-600' },
    LOBBY: { icon: '🏰', name: 'Lobby', bgColor: 'bg-gray-700', textColor: 'text-gray-300', borderColor: 'border-gray-600' },
  }[phase];

  return (
    <div className={`${PHASE_CONFIG.bgColor} ${PHASE_CONFIG.borderColor} ${PHASE_CONFIG.textColor} border-2 rounded-lg px-4 py-2 flex items-center space-x-2`}>
      <div className="text-xl">{PHASE_CONFIG.icon}</div>
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sm">{PHASE_CONFIG.name}</span>
          {day > 0 && <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">Dia {day}</span>}
        </div>
        <p className="text-xs opacity-90">Fase simulada</p>
      </div>
    </div>
  );
};

// Timer Display
const MockTimerDisplay = ({ timeLeft }: { timeLeft: number }) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-gray-800 border-2 border-green-500 rounded-lg px-3 py-2 flex items-center space-x-2">
      <div className="text-lg">⏱️</div>
      <div className="text-center">
        <div className="text-lg font-mono font-bold text-green-400">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400">Restante</div>
      </div>
    </div>
  );
};

// Role Card
const MockRoleCard = () => {
  const { me } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!me?.role) {
    return (
      <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">❓</div>
          <p className="text-gray-400">Aguardando role...</p>
        </div>
      </div>
    );
  }

  const roleInfo = {
    name: me.role === 'SHERIFF' ? 'Sheriff' : me.role,
    icon: me.role === 'SHERIFF' ? '🕵️' : '🧑',
    faction: me.faction === 'TOWN' ? 'Vila' : me.faction,
    factionColor: me.faction === 'TOWN' ? 'text-green-400' : 'text-red-400',
  };

  return (
    <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
      <div
        className="bg-green-900 border-b border-green-600 p-4 rounded-t-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{roleInfo.icon}</div>
            <div>
              <h3 className="text-white font-bold">{roleInfo.name}</h3>
              <p className={`text-sm ${roleInfo.factionColor}`}>{roleInfo.faction}</p>
            </div>
          </div>
          <div className="text-white">{isExpanded ? '📖' : '📚'}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 p-4 space-y-3">
          <div>
            <h4 className="text-white font-semibold mb-2">🎯 Objetivo</h4>
            <p className="text-green-400 text-sm">Encontrar e eliminar todos os Lobisomens</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">⚡ Habilidades</h4>
            <p className="text-white/80 text-sm">• Investigar um jogador por noite</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">📊 Status</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/70">Vida:</span>
                <span className="text-green-400">Vivo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Ação:</span>
                <span className="text-amber-400">Disponível</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Player Circle
const MockPlayerCircle = () => {
  const { gameState, me } = useGame();
  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);

  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const angle = (index * 360) / totalPlayers - 90;
    const radiusX = 35;
    const radiusY = 30;

    const x = 50 + radiusX * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radiusY * Math.sin((angle * Math.PI) / 180);

    return { x, y };
  };

  return (
    <div className="w-full h-full bg-gray-800/30 border border-gray-600 rounded-lg relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-gray-900/50" />

      {/* Center - Gallows */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="text-center">
          <div className="text-6xl mb-2 filter drop-shadow-lg">🪓</div>
          <div className="text-amber-400 text-xs font-semibold">FORCA</div>
        </div>
      </div>

      {/* Living Players */}
      {alivePlayers.map((player, index) => {
        const position = getPlayerPosition(index, alivePlayers.length);
        const isMe = me?.userId === player.userId;
        const votesReceived = Object.values(gameState.votes || {}).filter(targetId => targetId === player.id).length;

        return (
          <div
            key={player.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <div className={`relative w-16 h-16 rounded-full border-2 transition-all duration-200 ${isMe ? 'border-blue-400 bg-blue-900/80 ring-2 ring-blue-400/50' : 'border-gray-600 bg-gray-700/80'
              }`}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-2xl">
                {player.isHost ? '👑' : isMe ? '👤' : '🧑'}
              </div>

              {/* Connection Status */}
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${player.isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} />

              {/* Vote Count */}
              {votesReceived > 0 && gameState.phase === 'VOTING' && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs rounded-full px-2 py-1 font-bold">
                  {votesReceived}
                </div>
              )}
            </div>

            {/* Player Name */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-center min-w-[80px]">
              <div className={`text-xs font-semibold truncate px-2 py-1 rounded ${isMe ? 'text-blue-300 bg-blue-900/50' : 'text-white bg-gray-800/50'
                }`}>
                {player.username}
              </div>
            </div>
          </div>
        );
      })}

      {/* Dead Players */}
      {deadPlayers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-center">
            <h4 className="text-red-400 text-sm font-semibold mb-2">💀 Cemitério ({deadPlayers.length})</h4>
            <div className="flex justify-center gap-2">
              {deadPlayers.map((player) => (
                <div key={player.id} className="relative opacity-75">
                  <div className="w-8 h-8 rounded-full border border-gray-600 bg-gray-800/50 flex items-center justify-center">
                    <span className="text-lg">👻</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-gray-400 text-center min-w-[40px]">
                    {player.username}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Chat Gigante
const MockChatGigante = () => {
  const { gameState, me } = useGame();
  const { sendMessage } = useSocket();
  const [activeTab, setActiveTab] = useState<'public' | 'werewolf' | 'dead'>('public');
  const [message, setMessage] = useState('');

  const mockMessages = [
    { id: '1', userId: 'user2', username: 'Maria Santos', message: 'Acho que o Pedro está muito suspeito...', channel: 'public', timestamp: new Date().toISOString() },
    { id: '2', userId: 'user4', username: 'Ana Costa', message: 'Ele não falou nada durante o dia todo!', channel: 'public', timestamp: new Date().toISOString() },
    { id: '3', userId: 'user1', username: 'João Silva', message: 'Eu investiguei ele ontem e deu SUSPEITO!', channel: 'public', timestamp: new Date().toISOString() },
    { id: '4', userId: 'user3', username: 'Pedro Oliveira', message: 'Calma pessoal, eu sou apenas um aldeão!', channel: 'public', timestamp: new Date().toISOString() },
  ];

  const tabs = [
    { id: 'public', name: 'Público', icon: '🗣️', available: true },
    { id: 'werewolf', name: 'Lobisomens', icon: '🐺', available: me?.role === 'WEREWOLF' },
    { id: 'dead', name: 'Mortos', icon: '👻', available: !me?.isAlive },
  ].filter(tab => tab.available);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessage('chat-message', { message: message.trim(), channel: activeTab });
    setMessage('');
  };

  return (
    <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-600 p-4">
        <h2 className="text-lg font-bold text-white mb-3">💬 Chat do Jogo</h2>

        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-white/70 hover:bg-gray-700'
                }`}
            >
              <span className="flex items-center space-x-1">
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-900/20">
        {mockMessages.map((msg) => (
          <div key={msg.id} className={`p-2 border-b border-gray-600/30 ${msg.userId === 'user1' ? 'bg-blue-900/20' : ''}`}>
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {msg.userId === 'user1' ? '👤' : '🧑'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`font-semibold text-sm ${msg.userId === 'user1' ? 'text-blue-300' : 'text-white'}`}>
                    {msg.username}
                  </span>
                  <span className="text-xs text-white/50">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-white/90 text-sm">{msg.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-600 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

// Action Panel
const MockActionPanel = () => {
  const { gameState, me } = useGame();
  const { sendMessage } = useSocket();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!me?.isAlive) {
    return (
      <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">👻</div>
          <h3 className="text-lg font-semibold text-white mb-2">Você está morto</h3>
          <p className="text-white/70">Observe o jogo em silêncio</p>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'DAY') {
    return (
      <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">☀️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Discussão do Dia</h3>
          <p className="text-white/70">Use o chat para discutir!</p>
        </div>
      </div>
    );
  }

  const validTargets = gameState.players.filter(p => p.isAlive && p.id !== me.id);

  if (gameState.phase === 'NIGHT' && me.role === 'SHERIFF') {
    return (
      <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
        <div className="flex-shrink-0 border-b border-gray-600 p-4">
          <h3 className="text-lg font-bold text-white mb-2">🔍 Investigação</h3>
          <p className="text-white/70 text-sm">Escolha quem investigar</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {validTargets.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedTarget(player.id)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedTarget === player.id
                  ? 'border-blue-400 bg-blue-900/30'
                  : 'border-gray-600 bg-gray-700/30 hover:border-blue-400/50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    {player.isHost ? '👑' : '🧑'}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{player.username}</div>
                    <div className="text-white/50 text-sm">
                      {player.isConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-600 p-4">
          <button
            onClick={() => {
              if (selectedTarget) {
                sendMessage('game-action', { type: 'INVESTIGATE', targetId: selectedTarget });
                setSelectedTarget(null);
              }
            }}
            disabled={!selectedTarget}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {selectedTarget ? 'Investigar' : 'Selecione um alvo'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'VOTING') {
    return (
      <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
        <div className="flex-shrink-0 border-b border-gray-600 p-4">
          <h3 className="text-lg font-bold text-white mb-2">🗳️ Votação</h3>
          <p className="text-white/70 text-sm">Escolha quem executar</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {validTargets.map((player) => {
              const votes = Object.values(gameState.votes || {}).filter(v => v === player.id).length;
              return (
                <button
                  key={player.id}
                  onClick={() => sendMessage('vote', { targetId: player.id })}
                  className="w-full p-3 rounded-lg border-2 border-gray-600 bg-gray-700/30 hover:border-red-400/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        {player.isHost ? '👑' : '🧑'}
                      </div>
                      <div>
                        <div className="text-white font-medium">{player.username}</div>
                        <div className="text-white/50 text-sm">Clique para votar</div>
                      </div>
                    </div>
                    {votes > 0 && (
                      <div className="bg-red-600 text-white text-sm px-2 py-1 rounded-full font-bold">
                        {votes}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg p-4 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2">😴</div>
        <h3 className="text-lg font-semibold text-white mb-2">Sem Ações</h3>
        <p className="text-white/70">Aguardando sua vez...</p>
      </div>
    </div>
  );
};

// Will Notes
const MockWillNotes = () => {
  const [activeTab, setActiveTab] = useState<'will' | 'notes'>('will');
  const [will, setWill] = useState('Meu nome é João Silva e eu sou Sheriff.\nN1: Investiguei Pedro - SUSPEITO\nD1: Pedro está mentindo, vote nele!\nSe eu morrer, suspeitem de Pedro e Maria.');
  const [notes, setNotes] = useState('🔍 INVESTIGAÇÕES:\n- Pedro: SUSPEITO (N1)\n- Maria: Pendente (N2)\n\n⚡ SUSPEITOS:\n- Pedro (resultado + comportamento)\n- Julia (muito quieta)\n\n✅ CONFIRMADOS:\n- Ana (defende vila)\n- Carlos (ativo nas discussões)');

  return (
    <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-600 p-4">
        <h3 className="text-lg font-bold text-white mb-3">📜 Anotações</h3>

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('will')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'will' ? 'bg-amber-600 text-white' : 'bg-gray-700/50 text-white/70'
              }`}
          >
            📜 Testamento
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'notes' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-white/70'
              }`}
          >
            📝 Notas
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <textarea
          value={activeTab === 'will' ? will : notes}
          onChange={(e) => activeTab === 'will' ? setWill(e.target.value) : setNotes(e.target.value)}
          placeholder={activeTab === 'will' ? 'Seu testamento será revelado se você morrer...' : 'Suas anotações pessoais...'}
          className="w-full h-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-amber-400 font-mono"
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-600 p-3">
        <div className="text-xs text-white/50">
          {activeTab === 'will' ? (
            <div>💡 Dica: Seu testamento será revelado quando você morrer</div>
          ) : (
            <div>💡 Dica: Use as notas para rastrear suas investigações</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Player List
const MockPlayerList = () => {
  const { gameState, me } = useGame();
  const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isSpectator);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);

  const PlayerRow = ({ player, isDead = false }: { player: Player; isDead?: boolean }) => {
    const isMe = me?.userId === player.userId;
    const votesReceived = Object.values(gameState.votes || {}).filter(v => v === player.id).length;

    return (
      <div className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${isMe ? 'bg-blue-900/50 border border-blue-600' : isDead ? 'bg-gray-800/30 opacity-75' : 'bg-gray-700/30'
        }`}>
        {/* Status */}
        <div className="flex flex-col items-center space-y-1">
          <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {votesReceived > 0 && (
            <div className="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {votesReceived}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDead ? 'bg-gray-700' : isMe ? 'bg-blue-800' : 'bg-gray-600'
          }`}>
          {isDead ? '💀' : player.isHost ? '👑' : isMe ? '👤' : '🧑'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${isDead ? 'text-gray-400' : isMe ? 'text-blue-300' : 'text-white'
            }`}>
            {player.username}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {isMe && <span className="bg-blue-600 text-white text-xs px-1 rounded">Você</span>}
            {player.isHost && <span className="bg-amber-600 text-white text-xs px-1 rounded">Host</span>}
            {isDead && player.role && <span className="bg-purple-600 text-white text-xs px-1 rounded">{player.role}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-800/30 border border-gray-600 rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-600 p-4">
        <h3 className="text-lg font-bold text-white mb-2">👥 Jogadores</h3>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-400">Vivos: {alivePlayers.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-400">Mortos: {deadPlayers.length}</span>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Living Players */}
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2">💚 Vivos ({alivePlayers.length})</h4>
          <div className="space-y-1">
            {alivePlayers.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </div>
        </div>

        {/* Dead Players */}
        {deadPlayers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-2">💀 Mortos ({deadPlayers.length})</h4>
            <div className="space-y-1">
              {deadPlayers.map((player) => (
                <PlayerRow key={player.id} player={player} isDead={true} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vote Summary */}
      {gameState.phase === 'VOTING' && Object.keys(gameState.votes || {}).length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-600 p-4">
          <h4 className="text-sm font-semibold text-white mb-2">🗳️ Resumo dos Votos</h4>
          <div className="space-y-1">
            {Object.entries(
              Object.values(gameState.votes || {}).reduce((acc, targetId) => {
                acc[targetId] = (acc[targetId] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([playerId, count]) => {
              const player = alivePlayers.find(p => p.id === playerId);
              return player ? (
                <div key={playerId} className="flex justify-between text-sm">
                  <span className="text-white">{player.username}</span>
                  <span className="bg-red-700 text-white px-2 py-1 rounded text-xs">{count}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Game Board
const MockGameBoard = ({ gameState }: { gameState: GameState }) => {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="h-16 bg-gray-800/50 border-b border-gray-600 flex items-center justify-between px-4">
        <MockPhaseIndicator phase={gameState.phase} day={gameState.day} />

        <div className="flex items-center space-x-2">
          <span className="text-2xl">🐺</span>
          <h1 className="text-xl font-bold text-white">Lobisomem Online - MOCK</h1>
        </div>

        <MockTimerDisplay timeLeft={Math.floor(gameState.timeLeft / 1000)} />
      </header>

      {/* Main Grid - 6 Sections */}
      <main className="h-[calc(100vh-4rem)] grid grid-cols-12 grid-rows-2 gap-4 p-4">
        {/* Left Top - Role Card */}
        <section className="col-span-3 row-span-1">
          <MockRoleCard />
        </section>

        {/* Center Top - Player Circle */}
        <section className="col-span-6 row-span-1">
          <MockPlayerCircle />
        </section>

        {/* Right Full - Chat Gigante */}
        <section className="col-span-3 row-span-2">
          <MockChatGigante />
        </section>

        {/* Left Bottom - Player List */}
        <section className="col-span-3 row-span-1">
          <MockPlayerList />
        </section>

        {/* Center Bottom - Action Panel & Will Notes */}
        <section className="col-span-6 row-span-1 grid grid-cols-2 gap-4">
          <MockActionPanel />
          <MockWillNotes />
        </section>
      </main>
    </div>
  );
};

// =============================================================================
// MAIN MOCK COMPONENT
// =============================================================================
export default function NewGameMock() {
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('DAY');
  const [currentDay, setCurrentDay] = useState(2);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Simulate phase changes
  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setCurrentPhase(prev => {
        const phases: GamePhase[] = ['DAY', 'VOTING', 'NIGHT'];
        const currentIndex = phases.indexOf(prev);
        const nextIndex = (currentIndex + 1) % phases.length;

        if (phases[nextIndex] === 'DAY') {
          setCurrentDay(d => d + 1);
        }

        setTimeLeft(120);
        return phases[nextIndex];
      });
    }, 30000); // 30 seconds per phase

    return () => clearInterval(phaseInterval);
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando mock...</div>
      </div>
    );
  }

  const gameState = createMockGameState(currentPhase, currentDay);
  gameState.timeLeft = timeLeft * 1000; // Convert to milliseconds

  return (
    <MockSocketProvider>
      <MockGameProvider gameState={gameState}>
        <div className="relative">
          {/* Mock Warning Banner */}
          <div className="absolute top-0 left-0 right-0 bg-yellow-900 border-b border-yellow-700 px-4 py-2 z-50">
            <div className="max-w-7xl mx-auto text-center">
              <div className="text-yellow-100 text-sm">
                <strong>🧪 MODO TESTE:</strong> Interface Town of Salem com dados simulados.
                Fases mudam a cada 30s: {currentPhase} (Dia {currentDay}) •
                Você é <strong>João Silva (Sheriff)</strong> •
                <button
                  onClick={() => window.location.href = '/lobby'}
                  className="ml-2 underline hover:text-yellow-200"
                >
                  ← Voltar ao Lobby
                </button>
              </div>
            </div>
          </div>

          {/* Game Board */}
          <div className="pt-12">
            <MockGameBoard gameState={gameState} />
          </div>
        </div>
      </MockGameProvider>
    </MockSocketProvider>
  );
}