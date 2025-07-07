// 🐺 LOBISOMEM ONLINE - Game Engine (VERSÃO FINAL E CORRIGIDA)
import { GameState, Player } from './Game';
import { RoleDistributor, WinConditionCalculator, ROLE_CONFIGURATIONS } from './RoleSystem';
import { PhaseManager } from './PhaseManager';
import { VotingManager } from './VotingManager';
import { Role, Faction, GamePhase } from '@/utils/constants';
import type { GameConfig, GameResults, IGameStateService } from '@/types';
import { logger } from '@/utils/logger';

export class GameEngine implements IGameStateService {
    private games = new Map<string, GameState>();
    private votingManagers = new Map<string, VotingManager>();
    private phaseManagers = new Map<string, PhaseManager>();
    private eventHandlers = new Map<string, Map<string, ((data: any) => void)[]>>();

    // ✅ 1. A ponte para o WebSocket: uma função de broadcast.
    private broadcast: (roomId: string, type: string, data: any, excludeConnectionId?: string) => void = () => { };

    constructor() {
        logger.info('GameEngine initialized');
    }

    // ✅ 2. Método público para injetar a função de broadcast a partir do server.ts
    public setBroadcaster(broadcaster: (roomId: string, type: string, data: any, excludeConnectionId?: string) => void) {
        this.broadcast = broadcaster;
    }

    public async forcePhase(gameId: string): Promise<void> {
        const phaseManager = this.phaseManagers.get(gameId);
        if (phaseManager) {
            await phaseManager.forceNextPhase();
        } else {
            logger.warn('Could not force phase: PhaseManager not found for game', { gameId });
        }
    }

    async createGame(hostId: string, config: GameConfig): Promise<GameState> {
        const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const gameState = new GameState(gameId, config, hostId);
        const votingManager = new VotingManager(gameState);
        const phaseManager = new PhaseManager(gameState, this);
        this.games.set(gameId, gameState);
        this.votingManagers.set(gameId, votingManager);
        this.phaseManagers.set(gameId, phaseManager);
        logger.info('Game created', { gameId, hostId });
        return gameState;
    }

    async startGame(gameId: string): Promise<boolean> {
        const gameState = this.games.get(gameId);
        const phaseManager = this.phaseManagers.get(gameId);

        if (!gameState || !phaseManager) return false;
        if (!gameState.canStart()) {
            logger.warn('Game cannot start - requirements not met', { gameId, players: gameState.players.length, status: gameState.status });
            return false;
        }

        try {
            gameState.start();
            const players = gameState.getAlivePlayers();
            const distribution = RoleDistributor.getRoleDistribution(players.length);
            const roleAssignments = RoleDistributor.distributeRolesToPlayers(players.map(p => p.id), distribution);
            roleAssignments.forEach((role, playerId) => {
                const player = gameState.getPlayer(playerId);
                if (player) player.assignRole(role, ROLE_CONFIGURATIONS[role].faction, ROLE_CONFIGURATIONS[role].maxActions);
            });

            // ✅ CORREÇÃO: Definir o status e logar explicitamente
            gameState.status = 'PLAYING';
            logger.info('Game status changed to PLAYING', { gameId });

            this.emitGameEvent(gameId, 'game-started', { gameId, players: players.map(p => p.getPublicInfo()) });

            await phaseManager.startFirstNight();

            logger.info('Game started and first night initiated', { gameId });
            return true;
        } catch (error) {
            logger.error('Failed to start game', error as Error, { gameId });
            return false;
        }
    }

    // ✅ 3. O emitGameEvent agora usa a função de broadcast injetada.
    public emitGameEvent(gameId: string, event: string, data: any): void {
        const game = this.games.get(gameId);
        if (game) {
            this.broadcast(game.roomId, event, data);
        }
    }

    async endGame(gameId: string, reason?: string): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState || gameState.status === 'FINISHED') return;

        try {
            const alivePlayers = gameState.getAlivePlayers();
            const winCondition = WinConditionCalculator.calculateWinCondition(
                alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
            );

            gameState.endGame(winCondition.winningFaction, winCondition.winningPlayers);

            logger.info('Game ended', {
                gameId,
                winningFaction: gameState.winningFaction,
                winningPlayers: gameState.winningPlayers,
                reason,
                totalDays: gameState.day,
            });

            this.emitGameEvent(gameId, 'game:ended', {
                gameId,
                winningFaction: gameState.winningFaction,
                winningPlayers: gameState.winningPlayers,
                reason,
                totalDays: gameState.day,
                finalResults: this.generateGameResults(gameState),
            });

        } catch (error) {
            logger.error('Error ending game', error instanceof Error ? error : new Error('Unknown game end error'), { gameId });
        }
    }

    //====================================================================
    // PLAYER MANAGEMENT
    //====================================================================
    async addPlayer(gameId: string, playerData: { userId: string; username: string; isHost: boolean }): Promise<boolean> {
        const gameState = this.games.get(gameId);
        if (!gameState) return false;

        const player = new Player({
            id: `${gameId}-${playerData.userId}`, // Formato de ID padronizado
            userId: playerData.userId,
            username: playerData.username,
            isHost: playerData.isHost,
            isReady: true,
            isSpectator: false,
            isConnected: true,
            joinedAt: new Date(),
            lastSeen: new Date(),
        });

        const success = gameState.addPlayer(player);

        if (success) {
            logger.info('Player instance created and added to game', {
                gameId,
                playerId: player.id,
                userId: player.userId,
                username: player.username,
            });

            this.emitGameEvent(gameState.roomId, 'player:joined', { // Emite para a roomId
                gameId,
                player: player.getPublicInfo(),
            });
        }

        return success;
    }

    async removePlayer(gameId: string, playerId: string): Promise<boolean> {
        const gameState = this.games.get(gameId);
        if (!gameState) return false;

        const player = gameState.getPlayer(playerId);
        const success = gameState.removePlayer(playerId);

        if (success && player) {
            logger.info('Player removed from game', {
                gameId,
                playerId,
                username: player.username,
            });

            this.emitGameEvent(gameId, 'player:left', {
                gameId,
                playerId,
                username: player.username,
            });

            if (gameState.status === 'PLAYING') {
                const alivePlayers = gameState.getAlivePlayers();
                if (alivePlayers.length < 3) {
                    await this.endGame(gameId, 'Insufficient players');
                    return true;
                }
                await this.checkWinCondition(gameId);
            }
        }

        return success;
    }

    // ✅ CORREÇÃO: Método adicionado para cumprir a interface IGameStateService
    async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
        const game = await this.getGameState(gameId);
        return game?.getPlayer(playerId) || null;
    }

    // ✅ CORREÇÃO: Método adicionado para cumprir a interface IGameStateService
    async getAllPlayers(gameId: string): Promise<Player[]> {
        const game = await this.getGameState(gameId);
        return game ? game.players : [];
    }

    // ✅ CORREÇÃO: Método adicionado para cumprir a interface IGameStateService
    async updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> {
        const game = await this.getGameState(gameId);
        const player = game?.getPlayer(playerId);
        if (player) {
            Object.assign(player, updates);
        }
    }

    //====================================================================
    // GAME STATE MANAGEMENT
    //====================================================================
    async getGameState(gameId: string): Promise<GameState | null> {
        return this.games.get(gameId) || null;
    }

    // ✅ CORREÇÃO: Método adicionado para cumprir a interface IGameStateService
    async getGame(gameId: string): Promise<GameState | null> {
        return this.getGameState(gameId);
    }

    async updateGameState(gameId: string, updates: Partial<GameState>): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) return;

        Object.assign(gameState, updates, { updatedAt: new Date() });

        this.emitGameEvent(gameId, 'game:state-updated', {
            gameId,
            updates,
        });
    }

    // ... (restante do código da classe GameEngine permanece o mesmo)
    // ... (incluindo nextPhase, processNightResults, etc.)
    //====================================================================
    // PLAYER ACTIONS
    //====================================================================
    async performPlayerAction(gameId: string, playerId: string, action: any): Promise<boolean> {
        const gameState = this.games.get(gameId);
        if (!gameState) return false;

        const player = gameState.getPlayer(playerId);
        if (!player || !player.isAlive) return false;

        if (gameState.phase === GamePhase.NIGHT && player.canAct()) {
            return player.performAction(action.type, action.targetId);
        }

        return false;
    }

    //====================================================================
    // TASK 7 - PHASE MANAGEMENT E VOTING SYSTEM
    //====================================================================
    async nextPhase(gameId: string): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) return;

        const currentPhase = gameState.phase;

        try {
            switch (currentPhase) {
                case GamePhase.NIGHT:
                    await this.processNightResults(gameState);
                    await this.changePhase(gameState, GamePhase.DAY, gameState.config.dayDuration);
                    break;
                case GamePhase.DAY:
                    await this.changePhase(gameState, GamePhase.VOTING, gameState.config.votingDuration);
                    break;
                case GamePhase.VOTING:
                    await this.processVotingResults(gameState);
                    if (gameState.status === 'PLAYING') {
                        await this.changePhase(gameState, GamePhase.NIGHT, gameState.config.nightDuration);
                    }
                    break;
                default:
                    break;
            }
            await this.checkWinCondition(gameId);
        } catch (error) {
            logger.error('Error during phase transition', error instanceof Error ? error : new Error('Unknown phase error'), {
                gameId,
                currentPhase,
            });
        }
    }

    //====================================================================
    // A7.1 - PROCESSAR RESULTADOS DA NOITE
    //====================================================================
    private async processNightResults(gameState: GameState): Promise<void> {
        logger.info('Processing night results', {
            gameId: gameState.gameId,
            day: gameState.day,
            actionsCount: gameState.nightActions.length,
        });

        const actions = gameState.nightActions.sort((a, b) => a.priority - b.priority);
        const nightResults = {
            protections: [] as string[],
            investigations: [] as any[],
            attacks: [] as any[],
            deaths: [] as any[],
        };

        for (const action of actions) {
            await this.processNightAction(action, nightResults, gameState);
        }

        nightResults.deaths.forEach(death => {
            const player = gameState.getPlayer(death.playerId);
            if (player && player.isAlive) {
                player.kill(death.cause as any, death.killedBy);
            }
        });

        this.emitGameEvent(gameState.gameId, 'day-results', {
            day: gameState.day,
            deaths: nightResults.deaths,
            messages: this.generateNightMessages(nightResults),
            nightResults,
            timestamp: new Date().toISOString(),
        });

        gameState.nightActions = [];

        logger.info('Night results processed', {
            gameId: gameState.gameId,
            deaths: nightResults.deaths.length,
            protections: nightResults.protections.length,
        });
    }

    private async processNightAction(action: any, results: any, gameState: GameState): Promise<void> {
        const actor = gameState.getPlayer(action.playerId);
        if (!actor || !actor.isAlive) return;

        switch (action.type) {
            case 'PROTECT':
                const target = gameState.getPlayer(action.targetId);
                if (target && target.canBeProtectedByDoctor) {
                    target.protect();
                    results.protections.push(action.targetId);
                }
                break;
            case 'INVESTIGATE':
                const investigateTarget = gameState.getPlayer(action.targetId);
                if (investigateTarget && investigateTarget.role) {
                    const result = this.getInvestigationResult(investigateTarget.role);
                    results.investigations.push({
                        investigatorId: action.playerId,
                        targetId: action.targetId,
                        result,
                    });
                }
                break;
            case 'WEREWOLF_KILL':
                const killTarget = gameState.getPlayer(action.targetId);
                if (killTarget && killTarget.isAlive) {
                    const successful = !killTarget.isProtected;
                    results.attacks.push({ attackerId: action.playerId, targetId: action.targetId, successful });
                    if (successful) {
                        results.deaths.push({ playerId: action.targetId, cause: 'NIGHT_KILL', killedBy: 'werewolves' });
                    }
                }
                break;
            case 'VIGILANTE_KILL':
                const vigilanteTarget = gameState.getPlayer(action.targetId);
                if (vigilanteTarget && vigilanteTarget.isAlive) {
                    const successful = !vigilanteTarget.isProtected;
                    results.attacks.push({ attackerId: action.playerId, targetId: action.targetId, successful });
                    if (successful) {
                        results.deaths.push({ playerId: action.targetId, cause: 'VIGILANTE', killedBy: action.playerId });
                    }
                }
                break;
            case 'SERIAL_KILL':
                const serialTarget = gameState.getPlayer(action.targetId);
                if (serialTarget && serialTarget.isAlive) {
                    const isFirstNight = gameState.day === 1;
                    const successful = !serialTarget.isProtected || isFirstNight;
                    results.attacks.push({ attackerId: action.playerId, targetId: action.targetId, successful });
                    if (successful) {
                        results.deaths.push({ playerId: action.targetId, cause: 'SERIAL_KILLER', killedBy: action.playerId });
                    }
                }
                break;
        }
    }

    private getInvestigationResult(role: Role): 'SUSPICIOUS' | 'NOT_SUSPICIOUS' {
        if (role === Role.WEREWOLF_KING) return 'NOT_SUSPICIOUS';
        if ([Role.WEREWOLF, Role.SERIAL_KILLER].includes(role)) return 'SUSPICIOUS';
        return 'NOT_SUSPICIOUS';
    }

    private generateNightMessages(results: any): string[] {
        const messages = [];
        if (results.deaths.length > 0) {
            results.deaths.forEach((death: any) => {
                let causeMessage = '';
                switch (death.cause) {
                    case 'NIGHT_KILL': causeMessage = 'foi encontrado morto pela manhã'; break;
                    case 'VIGILANTE': causeMessage = 'foi executado pelo vigilante'; break;
                    case 'SERIAL_KILLER': causeMessage = 'foi brutalmente assassinado'; break;
                }
                messages.push(`Um jogador ${causeMessage}.`);
            });
        } else {
            messages.push('Ninguém morreu durante a noite.');
        }
        return messages;
    }

    //====================================================================
    // A7.2, A7.3, A7.4 - SISTEMA DE VOTAÇÃO
    //====================================================================
    private async processVotingResults(gameState: GameState): Promise<void> {
        const votingManager = this.votingManagers.get(gameState.gameId);
        if (!votingManager) return;

        const results = votingManager.calculateVotingResults();

        if (results.executed) {
            const player = gameState.getPlayer(results.executed.playerId);
            if (player && player.role) {
                if (player.role === Role.JESTER) {
                    gameState.endGame(Faction.NEUTRAL, [player.id]);
                    this.emitGameEvent(gameState.gameId, 'voting-results', {
                        day: gameState.day,
                        executed: results.executed,
                        isJesterWin: true,
                        gameEnded: true,
                        winningFaction: Faction.NEUTRAL,
                        winningPlayers: [player.id],
                        timestamp: new Date().toISOString(),
                    });
                    logger.info('Jester wins by execution', { gameId: gameState.gameId, playerId: player.id });
                    return;
                }
                player.kill('EXECUTION');
                gameState.addEvent('PLAYER_EXECUTED', {
                    playerId: player.id, playerName: player.username, role: player.role, faction: player.faction,
                    votes: results.executed.votes, totalVoters: gameState.getAlivePlayers().length,
                });
            }
        }

        this.emitGameEvent(gameState.gameId, 'voting-results', {
            day: gameState.day, executed: results.executed, voteCounts: results.voteCounts,
            totalVotes: results.totalVotes, isTie: results.isTie, reason: results.reason,
            isJesterWin: false, gameEnded: false, timestamp: new Date().toISOString(),
        });

        logger.info('Voting results processed', {
            gameId: gameState.gameId, executed: results.executed?.playerId || 'none',
            totalVotes: results.totalVotes, isTie: results.isTie,
        });
    }

    //====================================================================
    // A7.5 - VERIFICAR CONDIÇÕES DE VITÓRIA
    //====================================================================
    private async checkWinCondition(gameId: string): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState || gameState.status !== 'PLAYING') return;

        const alivePlayers = gameState.getAlivePlayers();
        const winCondition = WinConditionCalculator.calculateWinCondition(
            alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
        );

        if (winCondition.hasWinner) {
            gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);
            this.emitGameEvent(gameId, 'game:ended', {
                gameId, winningFaction: winCondition.winningFaction, winningPlayers: winCondition.winningPlayers,
                reason: winCondition.reason, totalDays: gameState.day, finalResults: this.generateGameResults(gameState),
            });
            logger.info('Game ended - win condition met', {
                gameId, winningFaction: winCondition.winningFaction,
                reason: winCondition.reason,
            });
            gameState.phase = GamePhase.ENDED;
            gameState.status = 'FINISHED';
        }
    }

    //====================================================================
    // PHASE TRANSITION HELPERS
    //====================================================================
    private async startFirstNight(gameState: GameState): Promise<void> {
        await this.changePhase(gameState, GamePhase.NIGHT, gameState.config.nightDuration);
        gameState.addEvent('FIRST_NIGHT_STARTED', {
            message: 'A primeira noite chegou à vila. Os poderes especiais acordam...',
            day: gameState.day,
        });
    }

    private async changePhase(gameState: GameState, newPhase: GamePhase, duration: number): Promise<void> {
        gameState.changePhase(newPhase, duration);
        setTimeout(() => { this.nextPhase(gameState.gameId); }, duration);
        this.emitGameEvent(gameState.gameId, 'phase:changed', {
            gameId: gameState.gameId, phase: newPhase, duration,
            timeLeft: duration, day: gameState.day,
        });
    }

    //====================================================================
    // A7.2 - VOTING SYSTEM (vote, unvote)
    //====================================================================
    async castVote(gameId: string, voterId: string, targetId: string): Promise<boolean> {
        const gameState = this.games.get(gameId);
        const votingManager = this.votingManagers.get(gameId);
        if (!gameState || !votingManager) return false;

        const success = await votingManager.castVote(voterId, targetId);
        if (success) {
            this.emitGameEvent(gameId, 'vote', {
                gameId, voterId, targetId, day: gameState.day,
                voteCounts: votingManager.getVoteCountsWithNames(), timestamp: new Date().toISOString(),
            });
        }
        return success;
    }

    async removeVote(gameId: string, voterId: string): Promise<boolean> {
        const gameState = this.games.get(gameId);
        const votingManager = this.votingManagers.get(gameId);
        if (!gameState || !votingManager) return false;

        const success = await votingManager.removeVote(voterId);
        if (success) {
            this.emitGameEvent(gameId, 'vote', {
                gameId, voterId, targetId: null, day: gameState.day,
                voteCounts: votingManager.getVoteCountsWithNames(), timestamp: new Date().toISOString(),
            });
        }
        return success;
    }

    //====================================================================
    // EVENT SYSTEM
    //====================================================================
    onGameEvent(gameId: string, event: string, handler: (data: any) => void): void {
        const gameHandlers = this.eventHandlers.get(gameId);
        if (!gameHandlers) return;
        if (!gameHandlers.has(event)) gameHandlers.set(event, []);
        gameHandlers.get(event)!.push(handler);
    }

    //====================================================================
    // UTILITY METHODS
    //====================================================================
    private generateGameResults(gameState: GameState): GameResults {
        return {
            gameId: gameState.gameId, roomId: gameState.roomId,
            duration: gameState.finishedAt ? gameState.finishedAt.getTime() - (gameState.startedAt?.getTime() || 0) : 0,
            totalDays: gameState.day, ...(gameState.winningFaction && { winningFaction: gameState.winningFaction }),
            winningPlayers: gameState.winningPlayers,
            players: gameState.players.map(player => ({
                id: player.id, userId: player.userId, username: player.username,
                role: player.role ?? Role.VILLAGER, faction: player.faction ?? Faction.TOWN,
                survived: player.isAlive, won: gameState.winningPlayers.includes(player.id),
                eliminationReason: player.eliminationReason ?? '', killedBy: player.killedBy ?? '',
            })),
            events: gameState.events,
        };
    }

    //====================================================================
    // ADMINISTRATIVE METHODS
    //====================================================================
    async getActiveGamesCount(): Promise<number> {
        const count = Array.from(this.games.values())
            .filter(game => game.status === 'PLAYING').length;
        return Promise.resolve(count);
    }

    getAllGames(): GameState[] {
        return Array.from(this.games.values());
    }

    async getGamesByRoom(roomId: string): Promise<GameState[]> {
        const games = Array.from(this.games.values()).filter(game => game.roomId === roomId);
        return Promise.resolve(games);
    }

    async forceEndGame(gameId: string, reason: string): Promise<boolean> {
        const gameState = this.games.get(gameId);
        if (!gameState) return false;
        await this.endGame(gameId, reason);
        return true;
    }

    getGameStats(gameId: string): any {
        const gameState = this.games.get(gameId);
        if (!gameState) return null;
        return {
            gameId, status: gameState.status, phase: gameState.phase, day: gameState.day,
            playerCount: gameState.players.length, aliveCount: gameState.getAlivePlayers().length,
            spectatorCount: gameState.spectators.length, timeLeft: gameState.timeLeft,
            events: gameState.events.length,
        };
    }

    //====================================================================
    // CLEANUP
    //====================================================================
    async cleanup(): Promise<void> {
        this.games.clear();
        this.votingManagers.clear();
        this.eventHandlers.clear();
        logger.info('GameEngine cleanup completed');
    }
}