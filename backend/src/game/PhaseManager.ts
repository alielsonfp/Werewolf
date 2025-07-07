// 🐺 LOBISOMEM ONLINE - Phase Manager (CORRIGIDO)
import { GameState } from './Game';
import { RoleDistributor, RoleRevealManager, WinConditionCalculator } from './RoleSystem';
import { GamePhase, Faction, Role } from '@/utils/constants';
// ✅ CORREÇÃO: Importar o tipo IGameEngine que foi unificado com IGameStateService
import type { IGameStateService, NightResults } from '@/types';
// ✅ CORREÇÃO: Importar 'gameLogger' além do 'logger'
import { logger, gameLogger } from '@/utils/logger';

//====================================================================
// PHASE MANAGER CLASS
//====================================================================
export class PhaseManager {
    private gameState: GameState;
    // ✅ CORREÇÃO: O segundo argumento é o serviço do jogo, que agora é IGameStateService
    private gameService: IGameStateService;
    private currentPhaseTimer?: NodeJS.Timeout;

    constructor(gameState: GameState, gameService: IGameStateService) {
        this.gameState = gameState;
        this.gameService = gameService;
    }

    // ✅ CORREÇÃO: Implementação mais robusta com logs e verificação de status.
    public async forceNextPhase(): Promise<void> {
        if (this.currentPhaseTimer) {
            clearTimeout(this.currentPhaseTimer);
            // A correção está aqui: usamos 'delete' em vez de atribuir 'undefined'
            delete this.currentPhaseTimer;
        }

        // Log detalhado para depuração
        gameLogger.info('Phase transition forced by request', {
            gameId: this.gameState.gameId,
            currentPhase: this.gameState.phase,
            gameStatus: this.gameState.status,
        });

        // Verificação de segurança crucial
        if (this.gameState.status !== 'PLAYING') {
            gameLogger.warn('Cannot force next phase: game is not in PLAYING status.', {
                gameId: this.gameState.gameId,
                status: this.gameState.status,
            });
            return;
        }

        // Chama a transição de fase real
        await this.nextPhase();
    }

    //====================================================================
    // PHASE CONTROL
    //====================================================================
    async startFirstNight(): Promise<void> {
        logger.info('Starting first night phase', { gameId: this.gameState.gameId });
        await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);
        this.gameState.addEvent('FIRST_NIGHT_STARTED', {
            message: 'A primeira noite chegou à vila. Os poderes especiais acordam...',
            roles: this.getRolesForPhase(GamePhase.NIGHT),
        });
    }

    private async nextPhase(): Promise<void> {
        if (this.gameState.status !== 'PLAYING') return;

        const currentPhase = this.gameState.phase;
        gameLogger.info(`Transitioning from phase: ${currentPhase}`, { gameId: this.gameState.gameId });

        try {
            switch (currentPhase) {
                case GamePhase.LOBBY:
                    break;
                case GamePhase.NIGHT:
                    await this.processNightResults();
                    if (this.gameState.status === 'PLAYING') {
                        await this.changePhase(GamePhase.DAY, this.gameState.config.dayDuration);
                    }
                    break;
                case GamePhase.DAY:
                    await this.changePhase(GamePhase.VOTING, this.gameState.config.votingDuration);
                    break;
                case GamePhase.VOTING:
                    await this.processVotingResults();
                    if (this.gameState.status === 'PLAYING') {
                        await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);
                    }
                    break;
                case GamePhase.ENDED:
                    break;
            }
        } catch (error) {
            logger.error('Error during phase transition', error as Error, {
                gameId: this.gameState.gameId,
                currentPhase,
            });
        }
    }

    private async changePhase(newPhase: GamePhase, duration: number): Promise<void> {
        if (this.currentPhaseTimer) clearTimeout(this.currentPhaseTimer);

        this.gameState.changePhase(newPhase, duration);
        gameLogger.info('Phase changed', { gameId: this.gameState.gameId, to: newPhase });

        // ✅ CORRETO: Chama o método PÚBLICO do GameEngine, que agora faz o broadcast
        this.gameService.emitGameEvent(this.gameState.gameId, 'phase:changed', {
            gameId: this.gameState.gameId,
            phase: newPhase,
            duration,
            timeLeft: duration,
            day: this.gameState.day,
        });

        this.currentPhaseTimer = setTimeout(() => {
            this.nextPhase();
        }, duration);

        await this.onPhaseStart(newPhase);
    }

    // ... (O restante do arquivo, como onPhaseStart, processNightResults, etc., permanece o mesmo) ...

    //====================================================================
    // PHASE-SPECIFIC LOGIC
    //====================================================================
    private async onPhaseStart(phase: GamePhase): Promise<void> {
        switch (phase) {
            case 'NIGHT':
                await this.onNightStart();
                break;

            case 'DAY':
                await this.onDayStart();
                break;

            case 'VOTING':
                await this.onVotingStart();
                break;
        }
    }

    private async onNightStart(): Promise<void> {
        this.gameState.addEvent('NIGHT_STARTED', {
            day: this.gameState.day,
            message: `Noite ${this.gameState.day} - A vila dorme, mas alguns acordam...`,
            activeRoles: this.getRolesForPhase('NIGHT'),
            duration: this.gameState.config.nightDuration,
        });

        // Clear previous night's actions
        this.gameState.nightActions = [];

        // Reset player states for night
        this.gameState.players.forEach(player => {
            if (player.isAlive) {
                player.hasActed = false;
                player.removeProtection(); // Remove previous protection
            }
        });
    }

    private async onDayStart(): Promise<void> {
        this.gameState.addEvent('DAY_STARTED', {
            day: this.gameState.day,
            message: `Dia ${this.gameState.day} - O sol nasce e a vila acorda...`,
            duration: this.gameState.config.dayDuration,
        });
    }

    private async onVotingStart(): Promise<void> {
        const alivePlayers = this.gameState.getAlivePlayers();

        this.gameState.addEvent('VOTING_STARTED', {
            day: this.gameState.day,
            message: 'Hora da votação! Escolham quem será executado.',
            eligibleVoters: alivePlayers.map(p => ({ id: p.id, username: p.username })),
            duration: this.gameState.config.votingDuration,
        });

        this.gameState.players.forEach(player => {
            if (player.isAlive) {
                player.unvote();
            }
        });
    }

    //====================================================================
    // ✅ A7.1 - PROCESSAR RESULTADOS DA NOITE (IMPLEMENTADO)
    //====================================================================
    private async processNightResults(): Promise<void> {
        logger.info('Processing night results', {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
            actionsCount: this.gameState.nightActions.length,
        });

        // Get all night actions sorted by priority
        const actions = this.gameState.nightActions.sort((a, b) => a.priority - b.priority);

        // Track what happened during the night
        const nightResults: NightResults = {
            protections: [],
            investigations: [],
            attacks: [],
            deaths: [],
        };

        // Process actions by priority
        for (const action of actions) {
            await this.processNightAction(action, nightResults);
        }

        // Apply deaths AFTER all actions are processed
        nightResults.deaths.forEach(death => {
            const player = this.gameState.getPlayer(death.playerId);
            if (player && player.isAlive) {
                player.kill(death.cause as any, death.killedBy);
            }
        });

        // Generate night summary and broadcast day-results event
        await this.generateNightSummary(nightResults);

        // ✅ A7.5 - Check win conditions after night results
        await this.checkWinConditions();
    }

    private async processNightAction(action: any, results: NightResults): Promise<void> {
        const actor = this.gameState.getPlayer(action.playerId);
        if (!actor || !actor.isAlive) return;

        switch (action.type) {
            case 'PROTECT':
                await this.processProtection(action, results);
                break;

            case 'INVESTIGATE':
                await this.processInvestigation(action, results);
                break;

            case 'WEREWOLF_KILL':
                await this.processWerewolfKill(action, results);
                break;

            case 'VIGILANTE_KILL':
                await this.processVigilanteKill(action, results);
                break;

            case 'SERIAL_KILL':
                await this.processSerialKill(action, results);
                break;
        }
    }

    private async processProtection(action: any, results: NightResults): Promise<void> {
        const target = this.gameState.getPlayer(action.targetId);
        if (!target) return;

        // Check if doctor can protect this target
        if (!target.canBeProtectedByDoctor) {
            this.gameState.addEvent('PROTECTION_FAILED', {
                doctorId: action.playerId,
                targetId: action.targetId,
                reason: 'Não pode proteger a mesma pessoa duas noites seguidas',
            }, [action.playerId]);
            return;
        }

        target.protect();
        results.protections.push(action.targetId);

        this.gameState.addEvent('PROTECTION_APPLIED', {
            doctorId: action.playerId,
            targetId: action.targetId,
        }, [action.playerId]);

        logger.debug('Protection applied', {
            gameId: this.gameState.gameId,
            doctorId: action.playerId,
            targetId: action.targetId,
        });
    }

    private async processInvestigation(action: any, results: NightResults): Promise<void> {
        const target = this.gameState.getPlayer(action.targetId);
        if (!target || !target.role) return;

        const result = RoleRevealManager.getInvestigationResult(target.role);

        results.investigations.push({
            investigatorId: action.playerId,
            targetId: action.targetId,
            result,
        });

        this.gameState.addEvent('INVESTIGATION_RESULT', {
            investigatorId: action.playerId,
            targetId: action.targetId,
            targetName: target.username,
            result,
        }, [action.playerId]);

        logger.debug('Investigation completed', {
            gameId: this.gameState.gameId,
            investigatorId: action.playerId,
            targetId: action.targetId,
            result,
        });
    }

    private async processWerewolfKill(action: any, results: NightResults): Promise<void> {
        const target = this.gameState.getPlayer(action.targetId);
        if (!target || !target.isAlive) return;

        const successful = !target.isProtected;

        results.attacks.push({
            attackerId: action.playerId,
            targetId: action.targetId,
            successful,
        });

        if (successful) {
            results.deaths.push({
                playerId: action.targetId,
                cause: 'NIGHT_KILL',
                killedBy: 'werewolves',
            });
        }

        logger.debug('Werewolf attack processed', {
            gameId: this.gameState.gameId,
            targetId: action.targetId,
            successful,
            protected: target.isProtected,
        });
    }

    private async processVigilanteKill(action: any, results: NightResults): Promise<void> {
        const target = this.gameState.getPlayer(action.targetId);
        const vigilante = this.gameState.getPlayer(action.playerId);

        if (!target || !target.isAlive || !vigilante) return;

        const successful = !target.isProtected;

        results.attacks.push({
            attackerId: action.playerId,
            targetId: action.targetId,
            successful,
        });

        if (successful) {
            results.deaths.push({
                playerId: action.targetId,
                cause: 'VIGILANTE',
                killedBy: action.playerId,
            });

            // If vigilante killed a town member, they feel guilty and lose next action
            if (target.faction === 'TOWN') {
                // Mark vigilante as having guilt (would need to track this)
                this.gameState.addEvent('VIGILANTE_GUILT', {
                    vigilanteId: action.playerId,
                    killedTownMember: action.targetId,
                    message: 'O Vigilante sente remorso por matar um inocente',
                }, [action.playerId]);
            }
        }

        logger.debug('Vigilante kill processed', {
            gameId: this.gameState.gameId,
            vigilanteId: action.playerId,
            targetId: action.targetId,
            successful,
        });
    }

    private async processSerialKill(action: any, results: NightResults): Promise<void> {
        const target = this.gameState.getPlayer(action.targetId);
        if (!target || !target.isAlive) return;

        // Serial Killer is immune to doctor protection on first night
        const isFirstNight = this.gameState.day === 1;
        const successful = !target.isProtected || isFirstNight;

        results.attacks.push({
            attackerId: action.playerId,
            targetId: action.targetId,
            successful,
        });

        if (successful) {
            results.deaths.push({
                playerId: action.targetId,
                cause: 'SERIAL_KILLER',
                killedBy: action.playerId,
            });
        }

        logger.debug('Serial killer attack processed', {
            gameId: this.gameState.gameId,
            serialKillerId: action.playerId,
            targetId: action.targetId,
            successful,
            isFirstNight,
        });
    }

    //====================================================================
    // ✅ A7.4 - EXECUTAR JOGADOR VOTADO (IMPLEMENTADO)
    //====================================================================
    private async processVotingResults(): Promise<void> {
        const result = this.gameState.getMostVotedPlayer();

        if (result) {
            const player = this.gameState.getPlayer(result.playerId);
            if (player && player.role) {
                // Special case: Jester wins if executed
                if (player.role === Role.JESTER) {
                    this.gameState.endGame(Faction.NEUTRAL, [player.id]);

                    this.gameState.addEvent('JESTER_WINS', {
                        playerId: player.id,
                        playerName: player.username,
                        message: 'O Bobo da Corte venceu ao ser executado!',
                        role: player.role,
                        votes: result.votes,
                    });

                    // ✅ A7.6 - Evento voting-results
                    await this.broadcastVotingResults({
                        executed: {
                            playerId: player.id,
                            playerName: player.username,
                            role: player.role,
                            votes: result.votes,
                        },
                        isJesterWin: true,
                        gameEnded: true,
                        winningFaction: Faction.NEUTRAL,
                        winningPlayers: [player.id],
                    });

                    logger.info('Jester wins by execution', {
                        gameId: this.gameState.gameId,
                        playerId: player.id,
                        playerName: player.username,
                    });

                    return;
                }

                // Execute the player
                player.kill('EXECUTION');

                this.gameState.addEvent('PLAYER_EXECUTED', {
                    playerId: player.id,
                    playerName: player.username,
                    role: player.role,
                    faction: player.faction,
                    votes: result.votes,
                    totalVoters: this.gameState.getAlivePlayers().length,
                });

                // ✅ A7.6 - Evento voting-results
                await this.broadcastVotingResults({
                    executed: {
                        playerId: player.id,
                        playerName: player.username,
                        role: player.role,
                        votes: result.votes,
                    },
                    isJesterWin: false,
                    gameEnded: false,
                });

                logger.info('Player executed by vote', {
                    gameId: this.gameState.gameId,
                    playerId: player.id,
                    playerName: player.username,
                    role: player.role,
                    votes: result.votes,
                });
            }
        } else {
            // No execution - tie or insufficient votes
            this.gameState.addEvent('NO_EXECUTION', {
                reason: 'Empate na votação ou votos insuficientes',
                voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
            });

            // ✅ A7.6 - Evento voting-results (sem execução)
            await this.broadcastVotingResults({
                executed: null,
                reason: 'Empate na votação ou votos insuficientes',
                voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
                isJesterWin: false,
                gameEnded: false,
            });

            logger.info('No execution - tie or insufficient votes', {
                gameId: this.gameState.gameId,
                voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
            });
        }

        // ✅ A7.5 - Check win conditions after voting
        await this.checkWinConditions();
    }

    //====================================================================
    // ✅ A7.5 - VERIFICAR CONDIÇÕES DE VITÓRIA (IMPLEMENTADO)
    //====================================================================
    private async checkWinConditions(): Promise<void> {
        if (this.gameState.status !== 'PLAYING') return;

        const alivePlayers = this.gameState.getAlivePlayers();
        const winCondition = WinConditionCalculator.calculateWinCondition(
            alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
        );

        if (winCondition.hasWinner) {
            this.gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);

            // Broadcast game ended event
            this.gameState.addEvent('GAME_ENDED', {
                winningFaction: winCondition.winningFaction,
                winningPlayers: winCondition.winningPlayers,
                reason: winCondition.reason,
                totalDays: this.gameState.day,
                finalResults: this.generateFinalResults(),
            });

            logger.info('Game ended - win condition met', {
                gameId: this.gameState.gameId,
                winningFaction: winCondition.winningFaction,
                winningPlayers: winCondition.winningPlayers,
                reason: winCondition.reason,
            });

            // Change to ENDED phase
            this.gameState.phase = GamePhase.ENDED;
            this.gameState.status = 'FINISHED';
        }
    }

    //====================================================================
    // ✅ A7.6 - EVENTOS: day-results, vote, voting-results (IMPLEMENTADO)
    //====================================================================
    private async generateNightSummary(results: NightResults): Promise<void> {
        const messages = [];

        if (results.deaths.length > 0) {
            results.deaths.forEach((death: any) => {
                const player = this.gameState.getPlayer(death.playerId);
                if (player) {
                    let causeMessage = '';
                    switch (death.cause) {
                        case 'NIGHT_KILL': causeMessage = 'foi encontrado morto pela manhã'; break;
                        case 'VIGILANTE': causeMessage = 'foi executado pelo vigilante'; break;
                        case 'SERIAL_KILLER': causeMessage = 'foi brutalmente assassinado'; break;
                    }
                    messages.push(`${player.username} ${causeMessage}.`);
                }
            });
        } else {
            messages.push('Ninguém morreu durante a noite.');
        }

        const eventData = {
            day: this.gameState.day,
            deaths: results.deaths,
            messages,
            protections: results.protections.length,
            investigations: results.investigations.length,
            attacks: results.attacks.length,
            nightResults: results,
        };

        // Adiciona ao histórico interno
        this.gameState.addEvent('DAY_RESULTS', eventData);

        // ✅ CORREÇÃO: EMITE O EVENTO PARA OS CLIENTES
        this.gameService.emitGameEvent(this.gameState.gameId, 'day-results', eventData);

        logger.info('Night summary generated and broadcasted', {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
            deaths: results.deaths.length,
        });
    }

    private async broadcastVotingResults(data: any): Promise<void> {
        const eventData = {
            day: this.gameState.day,
            ...data,
            timestamp: new Date().toISOString(),
        };

        // Adiciona ao histórico interno
        this.gameState.addEvent('VOTING_RESULTS', eventData);

        // ✅ CORREÇÃO: EMITE O EVENTO PARA OS CLIENTES
        this.gameService.emitGameEvent(this.gameState.gameId, 'voting-results', eventData);

        logger.info('Voting results calculated and broadcasted', {
            gameId: this.gameState.gameId,
            executed: data.executed?.playerId || 'none',
            gameEnded: data.gameEnded || false,
        });
    }

    //====================================================================
    // UTILITY METHODS
    //====================================================================
    private getRolesForPhase(phase: string): string[] {
        return RoleDistributor.getRolesThatActDuring(phase);
    }

    private generateFinalResults(): any {
        const alivePlayers = this.gameState.getAlivePlayers();
        const deadPlayers = this.gameState.getDeadPlayers();

        return {
            alivePlayers: alivePlayers.map(p => ({
                id: p.id,
                username: p.username,
                role: p.role,
                faction: p.faction,
            })),
            deadPlayers: deadPlayers.map(p => ({
                id: p.id,
                username: p.username,
                role: p.role,
                faction: p.faction,
                eliminationReason: p.eliminationReason,
                killedBy: p.killedBy,
            })),
            totalDays: this.gameState.day,
            duration: this.gameState.finishedAt
                ? this.gameState.finishedAt.getTime() - (this.gameState.startedAt?.getTime() || 0)
                : 0,
        };
    }

    //====================================================================
    // CLEANUP
    //====================================================================
    cleanup(): void {
        if (this.currentPhaseTimer) {
            clearTimeout(this.currentPhaseTimer);
            delete this.currentPhaseTimer;
        }
    }
}