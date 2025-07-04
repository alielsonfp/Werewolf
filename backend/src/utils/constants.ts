// 🐺 LOBISOMEM ONLINE - Constants
// Game rules, limits, and configuration constants

//====================================================================
// BASIC TYPES DEFINITIONS
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

export interface RoleDefinition {
  role: Role;
  faction: Faction;
  name: string;
  description: string;
  abilities: string[];
  goalDescription: string;
  canAct: boolean;
  actsDuring: string[];
  hasNightChat: boolean;
  immuneToInvestigation: boolean;
  maxActions?: number;
}

//====================================================================
// GAME LIMITS
//====================================================================
export const GAME_LIMITS = {
  MIN_PLAYERS: 6,
  MAX_PLAYERS: 15,
  MAX_SPECTATORS: 5,

  // Room limits
  MAX_ROOM_NAME_LENGTH: 30,
  ROOM_CODE_LENGTH: 6,

  // Time limits (milliseconds)
  NIGHT_DURATION: 60000, // 60 seconds
  DAY_DURATION: 120000, // 2 minutes
  VOTING_DURATION: 30000, // 30 seconds

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
// ROLE DEFINITIONS
//====================================================================
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    faction: Faction.TOWN,
    name: 'Aldeão',
    description: 'Cidadão comum da vila',
    abilities: ['Votar durante o dia'],
    goalDescription: 'Eliminar todos os Lobisomens',
    canAct: false,
    actsDuring: [],
    hasNightChat: false,
    immuneToInvestigation: false,
  },

  [Role.SHERIFF]: {
    role: Role.SHERIFF,
    faction: Faction.TOWN,
    name: 'Investigador',
    description: 'Investiga pessoas durante a noite',
    abilities: ['Investigar uma pessoa por noite'],
    goalDescription: 'Encontrar e eliminar todos os Lobisomens',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
  },

  [Role.DOCTOR]: {
    role: Role.DOCTOR,
    faction: Faction.TOWN,
    name: 'Médico',
    description: 'Protege pessoas da morte durante a noite',
    abilities: ['Proteger uma pessoa por noite', 'Não pode se proteger consecutivamente'],
    goalDescription: 'Manter a vila viva e eliminar os Lobisomens',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
  },

  [Role.VIGILANTE]: {
    role: Role.VIGILANTE,
    faction: Faction.TOWN,
    name: 'Vigilante',
    description: 'Pode matar suspeitos durante a noite',
    abilities: ['Matar uma pessoa por noite (máximo 3 vezes)', 'Perde próxima ação se matar inocente'],
    goalDescription: 'Eliminar os inimigos da vila',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
    maxActions: 3,
  },

  [Role.WEREWOLF]: {
    role: Role.WEREWOLF,
    faction: Faction.WEREWOLF,
    name: 'Lobisomem',
    description: 'Elimina aldeões durante a noite',
    abilities: ['Votar em quem matar durante a noite', 'Chat secreto com outros Lobisomens'],
    goalDescription: 'Igualar ou superar o número de aldeões',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: true,
    immuneToInvestigation: false,
  },

  [Role.WEREWOLF_KING]: {
    role: Role.WEREWOLF_KING,
    faction: Faction.WEREWOLF,
    name: 'Rei dos Lobisomens',
    description: 'Líder da alcateia, imune à investigação',
    abilities: ['Liderar votação de morte noturna', 'Imune ao Investigador', 'Chat secreto com Lobisomens'],
    goalDescription: 'Comandar a alcateia para a vitória',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: true,
    immuneToInvestigation: true,
  },

  [Role.JESTER]: {
    role: Role.JESTER,
    faction: Faction.NEUTRAL,
    name: 'Bobo da Corte',
    description: 'Vence sendo executado por votação',
    abilities: ['Vencer se for executado durante o dia'],
    goalDescription: 'Ser executado por votação popular',
    canAct: false,
    actsDuring: [],
    hasNightChat: false,
    immuneToInvestigation: false,
  },

  [Role.SERIAL_KILLER]: {
    role: Role.SERIAL_KILLER,
    faction: Faction.NEUTRAL,
    name: 'Assassino em Série',
    description: 'Mata uma pessoa por noite, vence sozinho',
    abilities: ['Matar uma pessoa por noite', 'Imune a proteção na primeira noite'],
    goalDescription: 'Ser o último sobrevivente',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
  },
};

//====================================================================
// ROLE DISTRIBUTIONS BY PLAYER COUNT
//====================================================================
export const ROLE_DISTRIBUTIONS = {
  6: { // Minimum players
    [Role.VILLAGER]: 1,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 0,
    [Role.VIGILANTE]: 0,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 0,
  },
  9: { // Medium game
    [Role.VILLAGER]: 2,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },
  12: { // Standard game
    [Role.VILLAGER]: 4,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },
  15: { // Maximum players
    [Role.VILLAGER]: 6,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 3,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },
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