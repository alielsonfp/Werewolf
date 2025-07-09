// 🐺 LOBISOMEM ONLINE - Game Core Classes (FASE 1 - CORREÇÃO CRÍTICA)
import { Role, Faction, GamePhase } from '@/utils/constants';
import type { GameConfig, GameEvent, NightAction, GameStatus } from '@/types';
import { RoleRevealManager, WinConditionCalculator, ROLE_CONFIGURATIONS } from './RoleSystem';

//====================================================================
// PLAYER CLASS - COMPATÍVEL COM INTERFACE
//====================================================================
export class Player {
  public id: string;
  public userId: string;
  public username: string;
  public avatar?: string;
  public isHost: boolean;
  public isReady: boolean;
  public isSpectator: boolean;
  public isConnected: boolean;
  public joinedAt: Date;
  public lastSeen: Date;

  // Game-specific properties
  public role?: Role;
  public faction?: Faction;
  public isAlive: boolean = true;
  public isProtected: boolean = false;
  public hasActed: boolean = false;
  public hasVoted: boolean = false;
  public votedFor?: string;
  public actionsUsed: number = 0;
  public maxActions?: number;

  // Tracking
  public lastAction?: string;
  public protectedByDoctor: boolean = false;
  public canBeProtectedByDoctor: boolean = true;
  public investigatedBy: string[] = [];
  public killedBy?: string;
  public eliminationReason?: 'NIGHT_KILL' | 'EXECUTION' | 'VIGILANTE' | 'SERIAL_KILLER';

  constructor(data: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    isHost: boolean;
    isReady: boolean;
    isSpectator: boolean;
    isConnected: boolean;
    joinedAt: Date;
    lastSeen: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.username = data.username;
    if (data.avatar !== undefined) {
      this.avatar = data.avatar;
    }
    this.isHost = data.isHost;
    this.isReady = data.isReady;
    this.isSpectator = data.isSpectator;
    this.isConnected = data.isConnected;
    this.joinedAt = data.joinedAt;
    this.lastSeen = data.lastSeen;
  }

  // Player actions
  assignRole(role: Role, faction: Faction, maxActions?: number): void {
    this.role = role;
    this.faction = faction;
    if (maxActions !== undefined) {
      this.maxActions = maxActions;
    }
    this.actionsUsed = 0;
    this.hasActed = false;
  }

  canAct(): boolean {
    if (!this.isAlive || !this.role) return false;
    if (this.hasActed) return false;
    if (this.maxActions !== undefined && this.actionsUsed >= this.maxActions) return false;

    const roleConfig = ROLE_CONFIGURATIONS[this.role];
    return roleConfig?.canAct || false;
  }

  performAction(action: string, targetId?: string): boolean {
    if (!this.canAct()) return false;

    this.hasActed = true;
    this.lastAction = action;
    this.actionsUsed++;

    return true;
  }

  kill(reason: 'NIGHT_KILL' | 'EXECUTION' | 'VIGILANTE' | 'SERIAL_KILLER', killedBy?: string): void {
    this.isAlive = false;
    this.eliminationReason = reason;
    if (killedBy !== undefined) {
      this.killedBy = killedBy;
    }
    this.hasVoted = false;
    delete this.votedFor;
  }

  protect(): void {
    this.isProtected = true;
    this.protectedByDoctor = true;
  }

  removeProtection(): void {
    this.isProtected = false;
    this.protectedByDoctor = false;
  }

  vote(targetId: string): boolean {
    if (!this.isAlive) return false;
    this.hasVoted = true;
    this.votedFor = targetId;
    return true;
  }

  unvote(): boolean {
    if (!this.isAlive) return false;
    this.hasVoted = false;
    delete this.votedFor;
    return true;
  }

  resetForNewPhase(): void {
    this.hasActed = false;
    this.hasVoted = false;
    delete this.votedFor;
    this.removeProtection();
    this.canBeProtectedByDoctor = !this.protectedByDoctor;
  }

  // Utility methods
  getPublicInfo(): any {
    const info: any = {
      id: this.id,
      userId: this.userId,
      username: this.username,
      isHost: this.isHost,
      isReady: this.isReady,
      isSpectator: this.isSpectator,
      isConnected: this.isConnected,
      isAlive: this.isAlive,
      hasVoted: this.hasVoted,
      joinedAt: this.joinedAt,
      lastSeen: this.lastSeen,
    };
    if (this.avatar) info.avatar = this.avatar;
    if (this.votedFor) info.votedFor = this.votedFor;
    return info;
  }

  getPrivateInfo(): any {
    const info = {
      ...this.getPublicInfo(),
      isProtected: this.isProtected,
      hasActed: this.hasActed,
      actionsUsed: this.actionsUsed,
    };
    if (this.role) info.role = this.role;
    if (this.faction) info.faction = this.faction;
    if (this.maxActions) info.maxActions = this.maxActions;
    if (this.lastAction) info.lastAction = this.lastAction;
    if (this.eliminationReason) info.eliminationReason = this.eliminationReason;
    if (this.killedBy) info.killedBy = this.killedBy;
    return info;
  }
}

//====================================================================
// GAME STATE CLASS - FASE 1 COM CANSTART() MELHORADO
//====================================================================
export class GameState {
  public gameId: string;
  public roomId: string;
  public status: GameStatus;
  public phase: GamePhase;
  public day: number;
  public phaseStartTime: Date;
  public phaseEndTime: Date;
  public timeLeft: number; // milliseconds

  private playersMap: Map<string, Player>;
  private spectatorsSet: Set<string>;
  private eliminatedPlayersMap: Map<string, Player>;
  private votesMap: Map<string, string>; // voterId -> targetId

  public hostId: string;
  public config: GameConfig;
  public events: GameEvent[];
  public nightActions: NightAction[];

  public createdAt: Date;
  public updatedAt: Date;
  public startedAt?: Date;
  public finishedAt?: Date;

  public winningFaction?: Faction;
  public winningPlayers: string[] = [];

  constructor(gameId: string, config: GameConfig, hostId: string) {
    this.gameId = gameId;
    this.roomId = config.roomId;
    this.status = 'WAITING';
    this.phase = GamePhase.LOBBY;
    this.day = 0;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date();
    this.timeLeft = 0;

    this.playersMap = new Map();
    this.spectatorsSet = new Set();
    this.eliminatedPlayersMap = new Map();
    this.votesMap = new Map();

    this.hostId = hostId;
    this.config = config;
    this.events = [];
    this.nightActions = [];

    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Getters para compatibilidade com a interface
  get players(): Player[] {
    return Array.from(this.playersMap.values());
  }

  get spectators(): string[] {
    return Array.from(this.spectatorsSet);
  }

  get eliminatedPlayers(): Player[] {
    return Array.from(this.eliminatedPlayersMap.values());
  }

  get votes(): Record<string, string> {
    return Object.fromEntries(this.votesMap);
  }

  addPlayer(player: Player): boolean {
    if (this.playersMap.size >= this.config.maxPlayers) return false;
    if (this.status !== 'WAITING') return false;

    this.playersMap.set(player.id, player);
    this.updatedAt = new Date();

    this.addEvent('PLAYER_JOINED', {
      playerId: player.id,
      username: player.username,
      playerCount: this.playersMap.size,
    });

    return true;
  }

  removePlayer(playerId: string): boolean {
    const player = this.playersMap.get(playerId);
    if (!player) return false;

    this.playersMap.delete(playerId);

    if (this.status === 'PLAYING') {
      this.eliminatedPlayersMap.set(playerId, player);
    }

    this.updatedAt = new Date();

    this.addEvent('PLAYER_LEFT', {
      playerId: player.id,
      username: player.username,
      playerCount: this.playersMap.size,
    });

    return true;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.playersMap.get(playerId);
  }

  getAlivePlayers(): Player[] {
    return Array.from(this.playersMap.values()).filter(p => p.isAlive && !p.isSpectator);
  }

  getDeadPlayers(): Player[] {
    return Array.from(this.playersMap.values()).filter(p => !p.isAlive && !p.isSpectator);
  }

  // ✅ FASE 1 - CANSTART() MELHORADO E MAIS ROBUSTO
  canStart(): boolean {
    // ✅ Verificações básicas primeiro
    if (this.status !== 'WAITING') {
      return false;
    }

    const alivePlayers = this.getAlivePlayers();

    // ✅ Verificar quantidade de jogadores (6 a 15)
    if (alivePlayers.length < 6 || alivePlayers.length > 15) {
      return false;
    }

    // ✅ IMPORTANTE: Verificar se há pelo menos um host
    const hostPlayer = alivePlayers.find(p => p.isHost);
    if (!hostPlayer) {
      return false;
    }

    // ✅ LÓGICA ROBUSTA: O host não precisa estar "ready", apenas os outros jogadores
    const nonHostPlayers = alivePlayers.filter(p => !p.isHost);
    const allNonHostPlayersReady = nonHostPlayers.every(p => p.isReady);

    return allNonHostPlayersReady;
  }

  // ✅ FASE 1 - MÉTODO AUXILIAR PARA DEBUG E VALIDAÇÃO
  getStartRequirements(): {
    canStart: boolean;
    reasons: string[];
    playerCount: number;
    readyCount: number;
    hostReady: boolean;
    hostFound: boolean;
    nonHostPlayersReady: number;
    nonHostPlayersTotal: number;
  } {
    const reasons: string[] = [];
    const alivePlayers = this.getAlivePlayers();
    const hostPlayer = alivePlayers.find(p => p.isHost);
    const readyPlayers = alivePlayers.filter(p => p.isReady);

    if (this.status !== 'WAITING') {
      reasons.push(`Game status is ${this.status}, must be WAITING`);
    }

    if (alivePlayers.length < 6) {
      reasons.push(`Only ${alivePlayers.length} players, minimum is 6`);
    }

    if (alivePlayers.length > 15) {
      reasons.push(`${alivePlayers.length} players, maximum is 15`);
    }

    if (!hostPlayer) {
      reasons.push('No host player found');
    }

    const nonHostPlayers = alivePlayers.filter(p => !p.isHost);
    const notReadyNonHost = nonHostPlayers.filter(p => !p.isReady);

    if (notReadyNonHost.length > 0) {
      reasons.push(`${notReadyNonHost.length} non-host players not ready: ${notReadyNonHost.map(p => p.username).join(', ')}`);
    }

    return {
      canStart: reasons.length === 0,
      reasons,
      playerCount: alivePlayers.length,
      readyCount: readyPlayers.length,
      hostReady: hostPlayer?.isReady || false,
      hostFound: !!hostPlayer,
      nonHostPlayersReady: nonHostPlayers.filter(p => p.isReady).length,
      nonHostPlayersTotal: nonHostPlayers.length,
    };
  }

  start(): boolean {
    if (!this.canStart()) return false;

    this.status = 'STARTING';
    this.startedAt = new Date();
    this.updatedAt = new Date();

    this.addEvent('GAME_STARTING', {
      playerCount: this.getAlivePlayers().length,
    });

    return true;
  }

  changePhase(newPhase: GamePhase, duration: number): void {
    this.phase = newPhase;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + duration);
    this.timeLeft = duration;
    this.updatedAt = new Date();

    if (newPhase === GamePhase.DAY) {
      this.day++;
    }

    this.playersMap.forEach(player => player.resetForNewPhase());
    this.votesMap.clear();

    this.addEvent('PHASE_CHANGED', {
      phase: newPhase,
      day: this.day,
      duration,
      timeLeft: this.timeLeft,
    });
  }

  updateTimeLeft(): void {
    this.timeLeft = Math.max(0, this.phaseEndTime.getTime() - Date.now());
    this.updatedAt = new Date();
  }

  isPhaseExpired(): boolean {
    return Date.now() >= this.phaseEndTime.getTime();
  }

  addVote(voterId: string, targetId: string): boolean {
    const voter = this.playersMap.get(voterId);
    const target = this.playersMap.get(targetId);

    if (!voter || !target || !voter.isAlive || !target.isAlive) return false;
    if (this.phase !== GamePhase.VOTING) return false;

    this.votesMap.set(voterId, targetId);
    voter.vote(targetId);

    this.addEvent('VOTE_CAST', {
      voterId,
      targetId,
      voterUsername: voter.username,
      targetUsername: target.username,
    });

    return true;
  }

  removeVote(voterId: string): boolean {
    const voter = this.playersMap.get(voterId);
    if (!voter || !voter.isAlive) return false;

    const targetId = this.votesMap.get(voterId);
    this.votesMap.delete(voterId);
    voter.unvote();

    if (targetId) {
      const target = this.playersMap.get(targetId);
      this.addEvent('VOTE_REMOVED', {
        voterId,
        targetId,
        voterUsername: voter.username,
        targetUsername: target?.username,
      });
    }

    return true;
  }

  getVoteCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    this.votesMap.forEach((targetId) => {
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    });
    return counts;
  }

  getMostVotedPlayer(): { playerId: string; votes: number } | null {
    const counts = this.getVoteCounts();
    let maxVotes = 0;
    let mostVoted: string | null = null;
    let tieCount = 0;

    counts.forEach((votes, playerId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        mostVoted = playerId;
        tieCount = 1;
      } else if (votes === maxVotes) {
        tieCount++;
      }
    });

    if (tieCount > 1 || !mostVoted || maxVotes === 0) return null;

    return { playerId: mostVoted, votes: maxVotes };
  }

  addEvent(type: string, data: any, visibleTo?: string[]): void {
    const event: GameEvent = {
      id: `${this.gameId}-${this.events.length}`,
      type,
      phase: this.phase,
      day: this.day,
      timestamp: new Date(),
      data,
      ...(visibleTo && { visibleTo }),
    };

    this.events.push(event);
    this.updatedAt = new Date();
  }

  getEventsForPlayer(playerId: string): GameEvent[] {
    return this.events.filter(event =>
      !event.visibleTo || event.visibleTo.includes(playerId)
    );
  }

  checkWinCondition(): { hasWinner: boolean; winningFaction?: Faction; winningPlayers?: string[] } {
    const alivePlayers = this.getAlivePlayers();
    return WinConditionCalculator.calculateWinCondition(
      alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
    );
  }

  endGame(winningFaction?: Faction, winningPlayers?: string[]): void {
    this.status = 'FINISHED';
    this.finishedAt = new Date();
    this.updatedAt = new Date();
    if (winningFaction) {
      this.winningFaction = winningFaction;
    }
    if (winningPlayers) {
      this.winningPlayers = winningPlayers;
    }

    this.addEvent('GAME_ENDED', {
      winningFaction,
      winningPlayers,
      totalDays: this.day,
      duration: this.finishedAt.getTime() - (this.startedAt?.getTime() || 0),
    });
  }

  toJSON(): any {
    return {
      gameId: this.gameId,
      roomId: this.roomId,
      status: this.status,
      phase: this.phase,
      day: this.day,
      phaseStartTime: this.phaseStartTime,
      phaseEndTime: this.phaseEndTime,
      timeLeft: this.timeLeft,
      players: this.players,
      spectators: this.spectators,
      eliminatedPlayers: this.eliminatedPlayers,
      hostId: this.hostId,
      config: this.config,
      events: this.events,
      votes: this.votes,
      nightActions: this.nightActions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      winningFaction: this.winningFaction,
      winningPlayers: this.winningPlayers,
    };
  }
}