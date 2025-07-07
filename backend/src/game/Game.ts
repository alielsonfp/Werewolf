// 🐺 LOBISOMEM ONLINE - Game Core Classes (CORRIGIDO E FINALIZADO)
// ✅ COMPATÍVEL com types/index.ts e sistema de votação
import { Role, Faction, GamePhase } from '@/utils/constants';
import type { GameConfig, GameEvent, NightAction, GameStatus } from '@/types';
import { RoleRevealManager, WinConditionCalculator, ROLE_CONFIGURATIONS } from './RoleSystem';

//====================================================================
// PLAYER CLASS - ATUALIZADA COM MELHORIAS DE VOTAÇÃO
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

    // ✅ A7.2 - Voting tracking enhancements
    public votingHistory: Array<{
        day: number;
        targetId: string;
        timestamp: Date;
    }> = [];

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

    // ✅ A7.2 - Enhanced voting methods
    vote(targetId: string, day: number): boolean {
        if (!this.isAlive) return false;

        // Store previous vote in history if changing vote
        if (this.hasVoted && this.votedFor) {
            this.votingHistory.push({
                day,
                targetId: this.votedFor,
                timestamp: new Date(),
            });
        }

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

    // ✅ Get voting statistics for this player
    getVotingStats(): {
        totalVotes: number;
        votesPerDay: Record<number, string>;
        mostVotedPlayer?: string;
    } {
        const votesPerDay: Record<number, string> = {};
        const targetCounts: Record<string, number> = {};

        this.votingHistory.forEach(vote => {
            votesPerDay[vote.day] = vote.targetId;
            targetCounts[vote.targetId] = (targetCounts[vote.targetId] || 0) + 1;
        });

        // Find most voted player
        let mostVotedPlayer: string | undefined;
        let maxVotes = 0;
        Object.entries(targetCounts).forEach(([targetId, votes]) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                mostVotedPlayer = targetId;
            }
        });

        return {
            totalVotes: this.votingHistory.length,
            votesPerDay,
            ...(mostVotedPlayer && { mostVotedPlayer }),
        };
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
            votingStats: this.getVotingStats(),
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
// GAME STATE CLASS - ATUALIZADA COM MELHORIAS DE VOTAÇÃO
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
    private playersByUserId: Map<string, Player>;

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

    // ✅ A7.2-A7.5 - Enhanced voting tracking
    public votingHistory: Array<{
        day: number;
        voterId: string;
        targetId: string;
        timestamp: Date;
        phase: GamePhase;
    }> = [];

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
        this.playersByUserId = new Map();
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
        if (this.playersMap.has(player.id)) return false; // Evitar duplicatas
        if (this.status !== 'WAITING' && this.status !== 'STARTING') return false;

        this.playersMap.set(player.id, player);
        this.playersByUserId.set(player.userId, player);

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
        this.playersByUserId.delete(player.userId);

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

    getPlayerByUserId(userId: string): Player | undefined {
        return this.playersByUserId.get(userId);
    }

    getAlivePlayers(): Player[] {
        return Array.from(this.playersMap.values()).filter(p => p.isAlive && !p.isSpectator);
    }

    getDeadPlayers(): Player[] {
        return Array.from(this.playersMap.values()).filter(p => !p.isAlive && !p.isSpectator);
    }

    canStart(): boolean {
        const alivePlayers = this.getAlivePlayers();
        // A validação de "pronto" deve ser feita na camada da sala/roteador antes de chamar startGame.
        // O GameEngine confia que, se foi chamado, é para começar.
        return alivePlayers.length >= 6 &&
            alivePlayers.length <= 15 &&
            this.status === 'WAITING';
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

    // ✅ A7.2 - Enhanced voting methods
    addVote(voterUserId: string, targetUserId: string): boolean {
        const voter = this.getPlayerByUserId(voterUserId);
        const target = this.getPlayerByUserId(targetUserId);

        if (!voter || !target || !voter.isAlive || !target.isAlive) return false;
        if (this.phase !== GamePhase.VOTING) return false;
        if (voter.id === target.id) return false; // Can't vote for yourself

        // O resto da lógica usa os objetos Player corretos
        this.votingHistory.push({
            day: this.day,
            voterId: voter.id, // Armazena o playerId
            targetId: target.id, // Armazena o playerId
            timestamp: new Date(),
            phase: this.phase,
        });

        this.votesMap.set(voter.id, target.id);
        voter.vote(target.id, this.day);

        this.addEvent('VOTE_CAST', {
            voterId: voter.id,
            targetId: target.id,
            voterUsername: voter.username,
            targetUsername: target.username,
            day: this.day,
        });

        return true;
    }

    // ✅ CORREÇÃO: Lógica de remoção de voto usando userId
    removeVote(voterUserId: string): boolean {
        const voter = this.getPlayerByUserId(voterUserId);
        if (!voter || !voter.isAlive) return false;

        const targetId = this.votesMap.get(voter.id);
        if (!targetId) return false; // Não tinha voto para remover

        this.votesMap.delete(voter.id);
        voter.unvote();

        const target = this.playersMap.get(targetId);
        this.addEvent('VOTE_REMOVED', {
            voterId: voter.id,
            targetId,
            voterUsername: voter.username,
            targetUsername: target?.username,
            day: this.day,
        });

        return true;
    }

    getVoteCounts(): Map<string, number> {
        const counts = new Map<string, number>();
        this.votesMap.forEach((targetId) => {
            counts.set(targetId, (counts.get(targetId) || 0) + 1);
        });
        return counts;
    }

    // ✅ A7.3 - Enhanced vote calculation with tie detection
    getMostVotedPlayer(): { playerId: string; votes: number; isTie: boolean } | null {
        const counts = this.getVoteCounts();
        let maxVotes = 0;
        let mostVoted: string | null = null;
        let playersWithMaxVotes: string[] = [];

        counts.forEach((votes, playerId) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                mostVoted = playerId;
                playersWithMaxVotes = [playerId];
            } else if (votes === maxVotes && votes > 0) {
                playersWithMaxVotes.push(playerId);
            }
        });

        if (!mostVoted || maxVotes === 0) return null;

        const isTie = playersWithMaxVotes.length > 1;

        // In case of tie, return null (no execution)
        if (isTie) return null;

        return { playerId: mostVoted, votes: maxVotes, isTie: false };
    }

    // ✅ Get comprehensive voting statistics
    getVotingStatistics(): {
        currentVotes: Map<string, number>;
        totalVotes: number;
        participationRate: number;
        // ✅ CORREÇÃO: Substituir 'typeof this.votingHistory' pelo tipo explícito.
        votingHistory: Array<{
            day: number;
            voterId: string;
            targetId: string;
            timestamp: Date;
            phase: GamePhase;
        }>;
        consensusLevel: number;
    } {
        const currentVotes = this.getVoteCounts();
        const alivePlayers = this.getAlivePlayers();
        const totalVotes = this.votesMap.size;
        const participationRate = alivePlayers.length > 0 ? (totalVotes / alivePlayers.length) * 100 : 0;

        // Calculate consensus level (how concentrated votes are)
        let consensusLevel = 0;
        if (totalVotes > 0) {
            const maxVotes = Math.max(0, ...Array.from(currentVotes.values()));
            consensusLevel = (maxVotes / totalVotes) * 100;
        }

        return {
            currentVotes,
            totalVotes,
            participationRate,
            votingHistory: this.votingHistory,
            consensusLevel,
        };
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

    // ✅ A7.5 - Enhanced win condition checking
    checkWinCondition(): { hasWinner: boolean; winningFaction?: Faction; winningPlayers?: string[]; reason?: string } {
        const alivePlayers = this.getAlivePlayers();
        return WinConditionCalculator.calculateWinCondition(
            alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
        );
    }

    endGame(winningFaction?: Faction, winningPlayers?: string[]): void {
        this.status = 'FINISHED';
        this.finishedAt = new Date();
        this.updatedAt = new Date();

        if (winningFaction !== undefined) {
            this.winningFaction = winningFaction;
        }
        if (winningPlayers !== undefined) {
            this.winningPlayers = winningPlayers;
        }

        this.addEvent('GAME_ENDED', {
            winningFaction,
            winningPlayers,
            totalDays: this.day,
            duration: this.finishedAt.getTime() - (this.startedAt?.getTime() || 0),
            finalStats: this.getVotingStatistics(),
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
            votingHistory: this.votingHistory,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            winningFaction: this.winningFaction,
            winningPlayers: this.winningPlayers,
        };
    }
}