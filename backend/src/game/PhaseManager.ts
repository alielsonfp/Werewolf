// 🐺 LOBISOMEM ONLINE - Phase Manager (CORRIGIDO)
// ✅ CORREÇÃO DEFINITIVA: Execução imediata de mortes

import { GameState } from './Game';
import { RoleDistributor, RoleRevealManager } from './RoleSystem';
import { GamePhase, Faction, Role } from '@/utils/constants';
import type { IGameEngine, NightAction, NightResults } from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// PHASE MANAGER CLASS - CORRIGIDA
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

    await this.changePhase(GamePhase.NIGHT, this.gameState.config.nightDuration);

    this.gameState.addEvent('FIRST_NIGHT_STARTED', {
      message: 'A primeira noite chegou à vila. Os poderes especiais acordam...',
      roles: this.getRolesForPhase(GamePhase.NIGHT),
    });
  }

  async nextPhase(): Promise<void> {
    const currentPhase = this.gameState.phase;

    try {
      switch (currentPhase) {
        case GamePhase.LOBBY:
          break;

        case GamePhase.NIGHT:
          await this.processNightResults();
          await this.changePhase(GamePhase.DAY, this.gameState.config.dayDuration);
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
      logger.error('Error during phase transition', error instanceof Error ? error : new Error('Unknown phase error'), {
        gameId: this.gameState.gameId,
        currentPhase,
      });
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
      case GamePhase.NIGHT:
        await this.onNightStart();
        break;

      case GamePhase.DAY:
        await this.onDayStart();
        break;

      case GamePhase.VOTING:
        await this.onVotingStart();
        break;
    }
  }

  private async onNightStart(): Promise<void> {
    this.gameState.addEvent('NIGHT_STARTED', {
      day: this.gameState.day,
      message: `Noite ${this.gameState.day} - A vila dorme, mas alguns acordam...`,
      activeRoles: this.getRolesForPhase(GamePhase.NIGHT),
      duration: this.gameState.config.nightDuration,
    });

    this.gameState.nightActions = [];

    this.gameState.players.forEach(player => {
      if (player.isAlive) {
        player.hasActed = false;
        player.removeProtection();
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
  // NIGHT RESULTS PROCESSING - CORRIGIDO
  //====================================================================
  private async processNightResults(): Promise<void> {
    logger.info('Processing night results', {
      gameId: this.gameState.gameId,
      day: this.gameState.day,
      actionsCount: this.gameState.nightActions.length,
    });

    const actionsToProcess = [...this.gameState.nightActions];
    this.gameState.nightActions = [];

    const sortedActions = actionsToProcess.sort((a, b) => a.priority - b.priority);

    // Track what happened for the summary
    const nightSummary = {
      protections: [] as string[],
      investigations: [] as { investigatorId: string; targetId: string; result: string }[],
      attacks: [] as { attackerId: string; targetId: string; successful: boolean }[],
      deaths: [] as { playerId: string; playerName: string; cause: string }[],
    };

    // Process actions by priority
    for (const action of sortedActions) {
      await this.processNightAction(action, nightSummary);
    }

    // Generate night summary
    await this.generateNightSummary(nightSummary);
  }

  private async processNightAction(action: any, summary: any): Promise<void> {
    const actor = this.gameState.getPlayer(action.playerId);
    if (!actor || !actor.isAlive) return;

    // ✅ CORREÇÃO: Remover cases duplicados
    switch (action.type) {
      case 'PROTECT':
        await this.processProtection(action, summary);
        break;

      case 'INVESTIGATE':
        await this.processInvestigation(action, summary);
        break;

      case 'WEREWOLF_KILL':
        await this.processWerewolfKill(action, summary);
        break;

      case 'VIGILANTE_KILL':
        await this.processVigilanteKill(action, summary);
        break;

      case 'SERIAL_KILL':
        await this.processSerialKill(action, summary);
        break;
    }
  }

  private async processProtection(action: any, summary: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    if (!target) return;

    if (!target.canBeProtectedByDoctor) {
      this.gameState.addEvent('PROTECTION_FAILED', {
        doctorId: action.playerId,
        targetId: action.targetId,
        reason: 'Não pode proteger a mesma pessoa duas noites seguidas',
      }, [action.playerId]);
      return;
    }

    target.protect();
    summary.protections.push(action.targetId);

    this.gameState.addEvent('PROTECTION_APPLIED', {
      doctorId: action.playerId,
      targetId: action.targetId,
    }, [action.playerId]);
  }

  private async processInvestigation(action: any, summary: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    if (!target || !target.role) return;

    const result = RoleRevealManager.getInvestigationResult(target.role);

    summary.investigations.push({
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

  // ✅ CORREÇÃO PRINCIPAL: Execução imediata das mortes
  private async processWerewolfKill(action: any, summary: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    if (!target || !target.isAlive) return;

    const successful = !target.isProtected;

    summary.attacks.push({
      attackerId: action.playerId,
      targetId: action.targetId,
      successful,
    });

    if (successful) {
      // ✅ MATAR IMEDIATAMENTE
      target.kill('NIGHT_KILL', 'werewolves');

      summary.deaths.push({
        playerId: action.targetId,
        playerName: target.username,
        cause: 'NIGHT_KILL',
      });

      logger.info('Werewolf kill successful', {
        gameId: this.gameState.gameId,
        targetId: action.targetId,
        targetName: target.username,
      });
    }
  }

  private async processVigilanteKill(action: any, summary: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    const vigilante = this.gameState.getPlayer(action.playerId);

    if (!target || !target.isAlive || !vigilante) return;

    const successful = !target.isProtected;

    summary.attacks.push({
      attackerId: action.playerId,
      targetId: action.targetId,
      successful,
    });

    if (successful) {
      // ✅ MATAR IMEDIATAMENTE
      target.kill('VIGILANTE', action.playerId);

      summary.deaths.push({
        playerId: action.targetId,
        playerName: target.username,
        cause: 'VIGILANTE',
      });

      logger.info('Vigilante kill successful', {
        gameId: this.gameState.gameId,
        vigilanteId: action.playerId,
        targetId: action.targetId,
        targetName: target.username,
      });


      if (target.faction === Faction.TOWN || target.role === Role.JESTER) {
        if (vigilante) {
          vigilante.isGuilty = true; // MARCA O JOGADOR PARA MORRER DEPOIS
        }

        // O evento agora serve apenas como um registro do que aconteceu
        this.gameState.addEvent('VIGILANTE_GUILT', {
          vigilanteId: action.playerId,
          killedTownMember: action.targetId,
        }, [action.playerId]);
      }
    }
  }

  private async processSerialKill(action: any, summary: any): Promise<void> {
    const target = this.gameState.getPlayer(action.targetId);
    if (!target || !target.isAlive) return;

    // Serial Killer bypasses protection on first night
    const isFirstNight = this.gameState.day === 1;
    const successful = !target.isProtected || isFirstNight;

    summary.attacks.push({
      attackerId: action.playerId,
      targetId: action.targetId,
      successful,
    });

    if (successful) {
      // ✅ MATAR IMEDIATAMENTE
      target.kill('SERIAL_KILLER', action.playerId);

      summary.deaths.push({
        playerId: action.targetId,
        playerName: target.username,
        cause: 'SERIAL_KILLER',
      });

      logger.info('Serial killer kill successful', {
        gameId: this.gameState.gameId,
        serialKillerId: action.playerId,
        targetId: action.targetId,
        targetName: target.username,
        bypassedProtection: isFirstNight && target.isProtected,
      });
    }
  }

  //====================================================================
  // VOTING RESULTS PROCESSING
  //====================================================================
  private async processVotingResults(): Promise<void> {
    const result = this.gameState.getMostVotedPlayer();

    if (result) {
      const player = this.gameState.getPlayer(result.playerId);
      if (player && player.role) {
        if (player.role === Role.JESTER) {
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

    const winCondition = this.gameState.checkWinCondition();
    if (winCondition.hasWinner && this.gameState.status === 'PLAYING') {
      this.gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);
    }
  }

  //====================================================================
  // UTILITY METHODS
  //====================================================================
  private getRolesForPhase(phase: string): string[] {
    return RoleDistributor.getRolesThatActDuring(phase);
  }

  // ✅ MÉTODO CORRIGIDO COM FUNCIONALIDADE DE SUICÍDIO DO VIGILANTE
  private async generateNightSummary(summary: any): Promise<void> {
    const messages: string[] = [];
    const actualDeaths: any[] = []; // Lista para as mortes reais

    // ✅ NOVO: Verificar e aplicar o suicídio do Vigilante ANTES de processar outras mortes
    this.gameState.getAlivePlayers().forEach(player => {
      if (player.isGuilty) {
        // Mata o vigilante por suicídio
        player.kill('VIGILANTE_SUICIDE' as any, 'guilt');
        player.isGuilty = false; // Reseta o estado

        // Adiciona a morte por suicídio à lista de resultados da noite
        summary.deaths.push({
          playerId: player.id,
          playerName: player.username,
          cause: 'VIGILANTE_SUICIDE'
        });

        logger.info('Vigilante committed suicide due to guilt', {
          gameId: this.gameState.gameId,
          vigilanteId: player.id,
          vigilanteName: player.username,
        });
      }
    });

    // Agora, processamos todas as mortes (incluindo o possível suicídio)
    if (summary.deaths.length > 0) {
      summary.deaths.forEach((death: any) => {
        const player = this.gameState.getPlayer(death.playerId);
        if (player) { // Garante que o jogador ainda existe
          let causeMessage = '';

          // ✅ LÓGICA DAS MENSAGENS DO CHAT
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
            case 'VIGILANTE_SUICIDE': // <-- A NOVA MENSAGEM
              causeMessage = 'não aguentou o peso na consciência e cometeu suicídio';
              break;
            default:
              causeMessage = 'foi encontrado morto em circunstâncias misteriosas';
          }
          messages.push(`${player.username} ${causeMessage}.`);
          actualDeaths.push(death);
        }
      });
    } else {
      messages.push('Ninguém morreu durante a noite.');
    }

    // Evento final com os dados corretos
    this.gameState.addEvent('NIGHT_SUMMARY', {
      day: this.gameState.day,
      deaths: actualDeaths, // Usa a lista de mortes reais
      messages,
      protectionsCount: summary.protections.length,
      investigationsCount: summary.investigations.length,
      attacksCount: summary.attacks.length,
    });

    // ✅ VERIFICAR CONDIÇÃO DE VITÓRIA após todas as mortes
    const winCondition = this.gameState.checkWinCondition();
    if (winCondition.hasWinner && this.gameState.status === 'PLAYING') {
      this.gameState.endGame(winCondition.winningFaction!, winCondition.winningPlayers!);
    }
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
      delete this.currentPhaseTimer;
    }
  }
}