// 🐺 LOBISOMEM ONLINE - Phase Manager (REFATORADO)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → game-service

import { GameState } from './Game';
import { RoleDistributor, RoleRevealManager } from './RoleSystem';
import { GamePhase, Faction, Role } from '@/utils/constants';
import type { IGameEngine, NightAction, NightResults } from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// PHASE MANAGER CLASS - REFATORADA
//====================================================================
export class PhaseManager {
  private gameState: GameState;
  private gameEngine: IGameEngine;
  private currentPhaseTimer?: NodeJS.Timeout;

  constructor(gameState: GameState, gameEngine: IGameEngine) {
    this.gameState = gameState;
    this.gameEngine = gameEngine;
  }

  //====================================================================
  // PHASE CONTROL
  //====================================================================
  async startFirstNight(): Promise<void> {
    logger.info('Starting first night phase', { gameId: this.gameState.gameId });

    // CORREÇÃO 2: Usar o enum GamePhase
    await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);

    this.gameState.addEvent('FIRST_NIGHT_STARTED', {
      message: 'A primeira noite chegou à vila. Os poderes especiais acordam...',
      // CORREÇÃO 2: Usar o enum GamePhase
      roles: this.getRolesForPhase(GamePhase.NIGHT),
    });
  }

  async nextPhase(): Promise<void> {
    const currentPhase = this.gameState.phase;

    try {
      switch (currentPhase) {
        case GamePhase.LOBBY:
          // Should not happen during game
          break;

        case GamePhase.NIGHT:
          await this.processNightResults();
          // CORREÇÃO 2: Usar o enum GamePhase
          await this.changePhase(GamePhase.DAY, this.gameState.config.dayDuration);
          break;

        case GamePhase.DAY:
          // CORREÇÃO 2: Usar o enum GamePhase
          await this.changePhase(GamePhase.VOTING, this.gameState.config.votingDuration);
          break;

        case GamePhase.VOTING:
          await this.processVotingResults();
          // Check if game ended, otherwise go to next night
          if (this.gameState.status === 'PLAYING') {
            // CORREÇÃO 2: Usar o enum GamePhase
            await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);
          }
          break;

        case GamePhase.ENDED:
          // Game has ended, no more phases
          break;
      }
    } catch (error) {
      logger.error('Error during phase transition', error instanceof Error ? error : new Error('Unknown phase error'), {
        gameId: this.gameState.gameId,
        currentPhase,
      });

      // IMPORTANTE: Garantir que o jogo continua
      // Se estamos em uma fase ativa e o jogo não acabou, forçar próxima fase
      if (this.gameState.status === 'PLAYING' && currentPhase !== GamePhase.ENDED) {
        logger.warn('Forcing phase transition after error', {
          gameId: this.gameState.gameId,
          currentPhase,
        });

        // Tentar mudar para a próxima fase logicamente
        switch (currentPhase) {
          case GamePhase.NIGHT:
            await this.changePhase(GamePhase.DAY, this.gameState.config.dayDuration);
            break;
          case GamePhase.DAY:
            await this.changePhase(GamePhase.VOTING, this.gameState.config.votingDuration);
            break;
          case GamePhase.VOTING:
            await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);
            break;
        }
      }
    }
  }

  private async changePhase(newPhase: GamePhase, duration: number): Promise<void> {
    const oldPhase = this.gameState.phase;

    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer);
    }

    this.gameState.changePhase(newPhase, duration);

    logger.info('Phase changed', {
      gameId: this.gameState.gameId,
      from: oldPhase,
      to: newPhase,
      duration,
      day: this.gameState.day,
    });

    this.currentPhaseTimer = setTimeout(() => {
      this.nextPhase();
    }, duration);

    await this.onPhaseStart(newPhase);
  }


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
        // CORREÇÃO 3: Usar o método da classe Player que lida com 'undefined' corretamente
        player.unvote();
      }
    });
  }

  //====================================================================
  // NIGHT RESULTS PROCESSING
  //====================================================================
  private async processNightResults(): Promise<void> {
    logger.info('Processing night results', {
      gameId: this.gameState.gameId,
      day: this.gameState.day,
      actionsCount: this.gameState.nightActions.length,
    });

    try {
      // Get all night actions sorted by priority
      const actions = this.gameState.nightActions.sort((a, b) => a.priority - b.priority);

      // Track what happened during the night
      const nightResults = {
        protections: [] as string[],
        investigations: [] as { investigatorId: string; targetId: string; result: string }[],
        attacks: [] as { attackerId: string; targetId: string; successful: boolean }[],
        deaths: [] as { playerId: string; cause: string; killedBy?: string }[],
      };

      // Process actions by priority
      for (const action of actions) {
        await this.processNightAction(action, nightResults);
      }

      // Apply deaths com try/catch
      for (const death of nightResults.deaths) {
        try {
          const player = this.gameState.getPlayer(death.playerId);
          if (player && player.isAlive) {
            player.kill(death.cause as any, death.killedBy);
            logger.info('Player killed during night', {
              playerId: death.playerId,
              cause: death.cause,
              killedBy: death.killedBy
            });
          }
        } catch (error) {
          logger.error('Error killing player', error instanceof Error ? error : new Error('Unknown error'), {
            gameId: this.gameState.gameId,
            playerId: death.playerId,
          });
        }
      }

      // Generate night summary
      await this.generateNightSummary(nightResults);

      // Check win condition after all deaths processed
      const winCondition = this.gameState.checkWinCondition();
      if (winCondition.hasWinner && this.gameState.status === 'PLAYING') {
        this.gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);
      }

    } catch (error) {
      logger.error('Critical error processing night results', error instanceof Error ? error : new Error('Unknown error'), {
        gameId: this.gameState.gameId,
      });
      // Garante que o jogo continua mesmo com erro
      await this.generateNightSummary({ deaths: [], protections: [], investigations: [], attacks: [] });
    }
  }

  private async processNightAction(action: any, results: any): Promise<void> {
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

  private async processProtection(action: any, results: any): Promise<void> {
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
  }

  private async processInvestigation(action: any, results: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    if (!target || !target.role) return;

    // ✅ USAR RoleRevealManager em vez de reimplementar
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
  }

  private async processWerewolfKill(action: any, results: any): Promise<void> {
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
  }

  private async processVigilanteKill(action: any, results: any): Promise<void> {
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
        }, [action.playerId]);
      }
    }
  }

  private async processSerialKill(action: any, results: any): Promise<void> {
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
  }

  //====================================================================
  // VOTING RESULTS PROCESSING
  //====================================================================
  private async processVotingResults(): Promise<void> {
    try {
      const result = this.gameState.getMostVotedPlayer();

      if (result) {
        const player = this.gameState.getPlayer(result.playerId);
        if (player && player.role) { // Garante que player e role existem
          if (player.role === Role.JESTER) {
            // CORREÇÃO 4: Usar o enum Faction
            this.gameState.endGame(Faction.NEUTRAL, [player.id]);

            this.gameState.addEvent('JESTER_WINS', {
              playerId: player.id,
              playerName: player.username,
              message: 'O Bobo da Corte venceu ao ser executado!',
            });

            logger.info('Jester wins by execution', {
              gameId: this.gameState.gameId,
              playerId: player.id,
              playerName: player.username,
            });

            return;
          }

          // Matar jogador com proteção
          try {
            player.kill('EXECUTION');

            this.gameState.addEvent('PLAYER_EXECUTED', {
              playerId: player.id,
              playerName: player.username,
              role: player.role,
              faction: player.faction,
              votes: result.votes,
              totalVoters: this.gameState.getAlivePlayers().length,
            });

            logger.info('Player executed by vote', {
              gameId: this.gameState.gameId,
              playerId: player.id,
              playerName: player.username,
              role: player.role,
              votes: result.votes,
            });
          } catch (killError) {
            logger.error('Error executing player', killError instanceof Error ? killError : new Error('Unknown error'), {
              gameId: this.gameState.gameId,
              playerId: player.id,
            });
          }
        }
      } else {
        this.gameState.addEvent('NO_EXECUTION', {
          reason: 'Empate na votação ou votos insuficientes',
          voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
        });

        logger.info('No execution - tie or insufficient votes', {
          gameId: this.gameState.gameId,
          voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
        });
      }

      // Verificar vitória com proteção
      try {
        const winCondition = this.gameState.checkWinCondition();
        if (winCondition.hasWinner && this.gameState.status === 'PLAYING') {
          this.gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);
        }
      } catch (winError) {
        logger.error('Error checking win condition', winError instanceof Error ? winError : new Error('Unknown error'), {
          gameId: this.gameState.gameId,
        });
      }
    } catch (error) {
      logger.error('Critical error processing voting results', error instanceof Error ? error : new Error('Unknown error'), {
        gameId: this.gameState.gameId,
      });
    }
  }

  //====================================================================
  // UTILITY METHODS
  //====================================================================
  private getRolesForPhase(phase: string): string[] {
    return RoleDistributor.getRolesThatActDuring(phase);
  }

  private async generateNightSummary(results: any): Promise<void> {
    const messages = [];

    // Deaths
    if (results.deaths.length > 0) {
      results.deaths.forEach((death: any) => {
        const player = this.gameState.getPlayer(death.playerId);
        if (player) {
          let causeMessage = '';
          switch (death.cause) {
            case 'NIGHT_KILL':
              causeMessage = 'foi encontrado morto pela manhã';
              break;
            case 'VIGILANTE':
              causeMessage = 'foi executado pelo vigilante';
              break;
            case 'SERIAL_KILLER':
              causeMessage = 'foi brutalmente assassinado';
              break;
          }
          messages.push(`${player.username} ${causeMessage}.`);
        }
      });
    } else {
      messages.push('Ninguém morreu durante a noite.');
    }

    this.gameState.addEvent('NIGHT_SUMMARY', {
      day: this.gameState.day,
      deaths: results.deaths,
      messages,
      protections: results.protections.length,
      investigations: results.investigations.length,
      attacks: results.attacks.length,
    });
  }

  //====================================================================
  // TIMER MANAGEMENT
  //====================================================================
  getRemainingTime(): number {
    this.gameState.updateTimeLeft();
    return this.gameState.timeLeft;
  }

  isPhaseExpired(): boolean {
    return this.gameState.isPhaseExpired();
  }

  async forceNextPhase(): Promise<void> {
    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer);
    }
    await this.nextPhase();
  }

  //====================================================================
  // CLEANUP
  //====================================================================
  cleanup(): void {
    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer);
      // CORREÇÃO 5: Usar delete em vez de atribuir undefined
      delete this.currentPhaseTimer;
    }
  }
}