// 🐺 LOBISOMEM ONLINE - Constants (MODO DEBUG HABILITADO)
// ✅ MIN_PLAYERS alterado para 3 para facilitar testes

//====================================================================
// ENUMS DEFINITIONS (ÚNICOS AQUI)
//====================================================================
export enum Role {
  // Town roles
  VILLAGER = 'VILLAGER',
  SHERIFF = 'SHERIFF',
  DOCTOR = 'DOCTOR',
  VIGILANTE = 'VIGILANTE',
  // Werewolf roles
  WEREWOLF = 'WEREWOLF',
  WEREWOLF_KING = 'WEREWOLF_KING',
  // Neutral roles
  JESTER = 'JESTER',
  SERIAL_KILLER = 'SERIAL_KILLER',
}

export enum Faction {
  TOWN = 'TOWN',
  WEREWOLF = 'WEREWOLF',
  NEUTRAL = 'NEUTRAL',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  NIGHT = 'NIGHT',
  DAY = 'DAY',
  VOTING = 'VOTING',
  ENDED = 'ENDED',
}

//====================================================================
// GAME LIMITS
//====================================================================
export const GAME_LIMITS = {
  MIN_PLAYERS: 3, // ✅ ALTERADO DE 6 PARA 3 - MODO DEBUG
  MAX_PLAYERS: 15,
  MAX_SPECTATORS: 5,

  // Room limits
  MAX_ROOM_NAME_LENGTH: 30,
  ROOM_CODE_LENGTH: 6,

  // Time limits (milliseconds)
  NIGHT_DURATION: 40000, // 20 seconds
  DAY_DURATION: 35000, // 20 seconds
  VOTING_DURATION: 40000, // 20 seconds

  // Chat limits
  MAX_MESSAGE_LENGTH: 500,
  CHAT_RATE_LIMIT: 5, // messages per 10 seconds

  // Reconnection
  RECONNECT_TIMEOUT: 120000, // 2 minutes
  MAX_RECONNECT_ATTEMPTS: 5,

  // Heartbeat
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  HEARTBEAT_TIMEOUT: 5000, // 5 seconds
} as const;

//====================================================================
// THEMED NICKNAMES (MEDIEVAL PORTUGUESE)
//====================================================================
export const THEMED_NICKNAMES = [
  // Profissões
  'João Ferreiro', 'Maria Padeira', 'Pedro Lenhador', 'Ana Tecelã',
  'Carlos Moleiro', 'Isabel Costureira', 'Francisco Carpinteiro', 'Catarina Oleira',
  'Manuel Sapateiro', 'Teresa Lavadeira', 'António Pedreiro', 'Beatriz Bordadeira',
  'José Curtidor', 'Luísa Fiandeira', 'Miguel Cordoeiro', 'Clara Rendilheira',

  // Nomes medievais
  'Afonso o Bravo', 'Constança a Sábia', 'Nuno o Valente', 'Urraca a Bela',
  'Sancho o Forte', 'Mafalda a Justa', 'Garcia o Leal', 'Elvira a Piedosa',
  'Bermudo o Jovem', 'Teresa a Corajosa', 'Ramiro o Audaz', 'Sancha a Prudente',

  // Alcunhas regionais
  'Pedro do Norte', 'Maria da Ribeira', 'João da Montanha', 'Ana do Vale',
  'Carlos da Floresta', 'Isabel da Ponte', 'Francisco da Torre', 'Catarina do Campo',
  'Manuel do Rio', 'Teresa da Vila', 'António da Praça', 'Beatriz do Castelo',

  // Características
  'Rodrigo Barba-Ruiva', 'Leonor Olhos-Verdes', 'Vasco Perna-de-Pau', 'Marta Cabelo-Dourado',
  'Egas Mão-de-Ferro', 'Violante Voz-Doce', 'Álvaro Pé-Ligeiro', 'Branca Riso-Fácil',
] as const;

//====================================================================
// CHAT CHANNELS
//====================================================================
export const CHAT_CHANNELS = {
  LOBBY: 'lobby',
  ROOM: 'room',
  PUBLIC: 'public',
  WEREWOLF: 'werewolf',
  SPECTATOR: 'spectator',
  SYSTEM: 'system',
} as const;

//====================================================================
// INVESTIGATION RESULTS
//====================================================================
export const INVESTIGATION_RESULTS = {
  SUSPICIOUS: 'SUSPICIOUS',
  NOT_SUSPICIOUS: 'NOT_SUSPICIOUS',
} as const;

//====================================================================
// WIN CONDITIONS
//====================================================================
export const WIN_CONDITIONS = {
  TOWN_WINS: 'All werewolves have been eliminated',
  WEREWOLF_WINS: 'Werewolves equal or outnumber the town',
  JESTER_WINS: 'Jester was executed by vote',
  SERIAL_KILLER_WINS: 'Serial Killer is the last survivor',
} as const;

//====================================================================
// ACHIEVEMENT CATEGORIES
//====================================================================
export const ACHIEVEMENT_CATEGORIES = {
  FIRST_TIME: 'first_time',
  SURVIVAL: 'survival',
  ROLE_MASTERY: 'role_mastery',
  SOCIAL: 'social',
  STRATEGIC: 'strategic',
  SPECIAL: 'special',
} as const;

//====================================================================
// SYSTEM MESSAGES
//====================================================================
export const SYSTEM_MESSAGES = {
  GAME_STARTED: '🎮 O jogo começou! Boa sorte a todos!',
  NIGHT_PHASE: '🌙 A noite caiu sobre a vila...',
  DAY_PHASE: '☀ O sol nasceu. É hora de discutir!',
  VOTING_PHASE: '🗳 Hora da votação! Escolham com sabedoria.',
  PLAYER_ELIMINATED: (name: string, role: string) => `💀 ${name} foi eliminado! Era um(a) ${role}.`,
  GAME_ENDED: (faction: string) => `🏆 Fim de jogo! ${faction} venceu!`,
  PLAYER_JOINED: (name: string) => `👋 ${name} entrou na sala.`,
  PLAYER_LEFT: (name: string) => `👋 ${name} saiu da sala.`,
  RECONNECTED: (name: string) => `🔄 ${name} reconectou-se.`,
} as const;

//====================================================================
// ERROR MESSAGES
//====================================================================
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Token de acesso inválido ou expirado',
  FORBIDDEN: 'Você não tem permissão para esta ação',
  NOT_FOUND: 'Recurso não encontrado',
  ROOM_FULL: 'A sala está cheia',
  GAME_IN_PROGRESS: 'O jogo já está em andamento',
  INVALID_ACTION: 'Ação inválida',
  RATE_LIMITED: 'Muitas tentativas. Tente novamente mais tarde',
  VALIDATION_FAILED: 'Dados inválidos fornecidos',
  SERVER_ERROR: 'Erro interno do servidor',
} as const;