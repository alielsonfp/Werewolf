// 🐺 LOBISOMEM ONLINE - Game Engine (VERSÃO FINAL LIMPA - SEM DUPLICAÇÃO)
import { GameState, Player } from './Game';
import { RoleDistributor, WinConditionCalculator } from './RoleSystem';
import { Role, Faction, GamePhase } from '@/utils/constants';
import type { GameConfig, IGameEngine, GameResults, GameStatus } from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// GAME ENGINE IMPLEMENTATION - VERSÃO FINAL LIMPA
//====================================================================
export class GameEngine implements IGameEngine {
  private games = new Map<string, GameState>();
  private eventHandlers = new Map<string, Map<string, ((data: any) => void)[]>>();

  private sendToUser?: (userId: string, type: string, data?: any) => boolean;

  constructor() {
    logger.info('GameEngine initialized');
  }

  //====================================================================
  // MÉTODO PARA INJETAR sendToUser (Chamado pelo WebSocketManager)
  //====================================================================
  setSendToUserMethod(sendToUser: (userId: string, type: string, data?: any) => boolean): void {
    this.sendToUser = sendToUser;
    logger.info('SendToUser method injected into GameEngine');
  }

  //====================================================================
  // ✅ PONTE SISTEMA → CHAT
  //====================================================================
  private broadcastSystemMessage(gameId: string, text: string, channel: 'system' | 'public' = 'system'): void {
    const gameState = this.games.get(gameId);
    if (!gameState || !this.sendToUser) {
      logger.warn('Cannot broadcast system message - game or sendToUser not available', { gameId });
      return;
    }

    const systemMessage = {
      id: `system-${Date.now()}`,
      userId: 'system',
      username: 'Sistema',
      message: text,
      channel: channel,
      timestamp: new Date().toISOString(),
    };

    const allPlayers = gameState.players;
    let sentCount = 0;

    allPlayers.forEach(player => {
      if (this.sendToUser!(player.userId, 'chat-message', { message: systemMessage })) {
        sentCount++;
      }
    });

    logger.info('System message broadcast completed', {
      gameId,
      message: text,
      totalPlayers: allPlayers.length,
      sentCount
    });
  }

  //====================================================================
  // ✅ FEEDBACK INDIVIDUAL PARA AÇÕES
  //====================================================================
  private sendActionResult(gameId: string, playerId: string, actionType: string, result: string): void {
    const gameState = this.games.get(gameId);
    if (!gameState || !this.sendToUser) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const resultMessage = {
      id: `result-${Date.now()}`,
      userId: 'system',
      username: 'Sistema',
      message: result,
      channel: 'system',
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(player.userId, 'chat-message', { message: resultMessage });

    logger.info('Action result sent to player', {
      gameId,
      playerId,
      actionType,
      result
    });
  }

  //====================================================================
  // ✅✅✅ CORREÇÃO CRÍTICA: BROADCAST GAME STATE TO ALL PLAYERS ✅✅✅
  //====================================================================
  private async broadcastGameState(gameId: string): Promise<void> {
    const gameState = this.games.get(gameId);
    if (!gameState || !this.sendToUser) return;

    // ✅ MUDANÇA CRÍTICA: Usar TODOS os jogadores (vivos E mortos)
    const allPlayersInGame = gameState.players; // Era: gameState.getAlivePlayers()

    logger.info('Broadcasting game state to all players', {
      gameId,
      playerCount: allPlayersInGame.length,
      phase: gameState.phase,
      day: gameState.day
    });

    for (const player of allPlayersInGame) {
      try {
        const personalizedState = this.getPersonalizedGameState(gameState, player.userId);
        const success = this.sendToUser(player.userId, 'game-state', personalizedState);

        if (!success) {
          logger.warn('Failed to send game state to player', {
            gameId,
            playerId: player.id,
            userId: player.userId
          });
        }
      } catch (error) {
        logger.error('Error broadcasting to player',
          error instanceof Error ? error : new Error('Unknown broadcast error'),
          { gameId, playerId: player.id, userId: player.userId }
        );
      }
    }
  }

  //====================================================================
  // GAME LIFECYCLE
  //====================================================================
  async createGame(hostId: string, config: GameConfig): Promise<GameState> {
    const gameId = `game-${config.roomId}`;

    try {
      // ✅ CORREÇÃO: Usar configuração recebida (sem hardcoded durations)
      const gameState = new GameState(gameId, config, hostId);

      this.games.set(gameId, gameState);
      this.eventHandlers.set(gameId, new Map());

      logger.info('Game created with provided configuration', {
        gameId,
        roomId: config.roomId,
        hostId,
        nightDuration: `${config.nightDuration / 1000}s`,
        dayDuration: `${config.dayDuration / 1000}s`,
        votingDuration: `${config.votingDuration / 1000}s`
      });

      this.emitGameEvent(gameId, 'game:created', {
        gameId,
        hostId,
        roomId: config.roomId,
        config,
      });

      return gameState;
    } catch (error) {
      logger.error('Failed to create game', error instanceof Error ? error : new Error('Unknown game creation error'), { hostId, config });
      throw error;
    }
  }

  // ✅ startGame começa no DIA
  async startGame(gameId: string): Promise<boolean> {
    const gameState = this.games.get(gameId);

    if (!gameState) {
      const availableGameIds = Array.from(this.games.keys());
      logger.warn('Attempted to start non-existent game', {
        requestedGameId: gameId,
        availableGameIds,
        totalGames: this.games.size
      });
      return false;
    }

    if (!gameState.canStart()) {
      const alivePlayers = gameState.getAlivePlayers();
      const hostPlayer = alivePlayers.find(p => p.isHost);
      const nonHostPlayers = alivePlayers.filter(p => !p.isHost);
      const readyNonHostPlayers = nonHostPlayers.filter(p => p.isReady);

      logger.warn('Game cannot start - requirements not met', {
        gameId,
        status: gameState.status,
        totalPlayers: alivePlayers.length,
        hostFound: !!hostPlayer,
        hostReady: hostPlayer?.isReady || false,
        nonHostPlayers: nonHostPlayers.length,
        readyNonHostPlayers: readyNonHostPlayers.length,
        playersNotReady: nonHostPlayers.filter(p => !p.isReady).map(p => p.username),
      });
      return false;
    }

    try {
      gameState.start();

      const players = gameState.getAlivePlayers();
      const distribution = RoleDistributor.getRoleDistribution(players.length);
      const roleAssignments = RoleDistributor.distributeRolesToPlayers(
        players.map(p => p.id),
        distribution
      );

      roleAssignments.forEach((role, playerId) => {
        const player = gameState.getPlayer(playerId);
        if (player) {
          const roleConfig = RoleDistributor.getRoleConfig(role);
          player.assignRole(role, roleConfig.faction, roleConfig.maxActions);
        }
      });

      gameState.status = 'PLAYING';

      // Começar no DIA
      await this.changePhase(gameState, GamePhase.DAY, gameState.config.dayDuration);

      await this.sendInitialGameStateToAllPlayers(gameId);

      this.broadcastSystemMessage(gameId,
        `🎮 O jogo começou! Dia ${gameState.day} - Discutam e tentem descobrir quem são os lobisomens! (${gameState.config.dayDuration / 1000}s)`,
        'system'
      );

      logger.info('Game started successfully - begins with DAY phase', {
        gameId,
        roomId: gameState.roomId,
        playerCount: players.length,
        distribution,
        hostId: gameState.hostId,
        startPhase: 'DAY',
        dayDuration: `${gameState.config.dayDuration / 1000}s`
      });

      this.emitGameEvent(gameId, 'game:started', {
        gameId,
        players: players.map(p => ({
          id: p.id,
          username: p.username,
          role: p.role,
        })),
        distribution,
      });

      return true;
    } catch (error) {
      logger.error('Failed to start game', error instanceof Error ? error : new Error('Unknown game start error'), { gameId });
      return false;
    }
  }

  private async sendInitialGameStateToAllPlayers(gameId: string): Promise<void> {
    if (!this.sendToUser) {
      logger.error('SendToUser method not available - cannot send initial game state');
      return;
    }

    const gameState = this.games.get(gameId);
    if (!gameState) return;

    const players = gameState.getAlivePlayers();

    logger.info('Sending initial game state to all players', {
      gameId,
      playerCount: players.length
    });

    for (const player of players) {
      try {
        const personalizedGameState = this.getPersonalizedGameState(gameState, player.userId);
        const success = this.sendToUser(player.userId, 'game-state', personalizedGameState);

        if (success) {
          logger.debug('Initial game state sent to player', {
            gameId,
            playerId: player.id,
            userId: player.userId,
            username: player.username
          });
        } else {
          logger.warn('Failed to send initial game state to player', {
            gameId,
            playerId: player.id,
            userId: player.userId
          });
        }

      } catch (error) {
        logger.error('Error sending initial game state to player',
          error instanceof Error ? error : new Error('Unknown send error'),
          { gameId, playerId: player.id, userId: player.userId }
        );
      }
    }
  }

  private getPersonalizedGameState(gameState: GameState, userId: string): any {
    const fullState = gameState.toJSON();
    const currentPlayer = fullState.players.find((p: any) => p.userId === userId);

    fullState.players = fullState.players.map((player: any) => {
      if (player.userId === userId) {
        return player;
      } else if (!player.isAlive) {
        return player;
      } else {
        const { role, faction, hasActed, maxActions, actionsUsed, lastAction, ...publicData } = player;
        return publicData;
      }
    });

    fullState.nightActions = [];

    if (currentPlayer) {
      fullState.me = {
        id: currentPlayer.id,
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        role: currentPlayer.role,
        faction: currentPlayer.faction,
        isAlive: currentPlayer.isAlive,
        isProtected: currentPlayer.isProtected,
        hasActed: currentPlayer.hasActed,
        hasVoted: currentPlayer.hasVoted,
        votedFor: currentPlayer.votedFor,
        actionsUsed: currentPlayer.actionsUsed,
        maxActions: currentPlayer.maxActions,
      };
    }

    return fullState;
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

      const winMessage = winCondition.winningFaction === Faction.TOWN
        ? '🏆 A VILA VENCEU! Todos os lobisomens foram eliminados!'
        : winCondition.winningFaction === Faction.WEREWOLF
          ? '🐺 OS LOBISOMENS VENCERAM! Eles dominaram a vila!'
          : '🎭 VITÓRIA ESPECIAL! Condição de vitória alternativa atingida!';

      this.broadcastSystemMessage(gameId, winMessage, 'system');

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
  async addPlayer(gameId: string, player: Player): Promise<boolean> {
    const gameState = this.games.get(gameId);
    if (!gameState) return false;

    const success = gameState.addPlayer(player);

    if (success) {
      logger.info('Player added to game', {
        gameId,
        playerId: player.id,
        username: player.username,
        isSpectator: player.isSpectator,
      });

      this.emitGameEvent(gameId, 'player:joined', {
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

  //====================================================================
  // GAME STATE MANAGEMENT
  //====================================================================
  async getGameState(gameId: string): Promise<GameState | null> {
    return this.games.get(gameId) || null;
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

  //====================================================================
  // PLAYER ACTIONS - ✅ COM ANTI-SPAM E FEEDBACK
  //====================================================================
  async performPlayerAction(gameId: string, userId: string, action: any): Promise<boolean> {
    const gameState = this.games.get(gameId);
    if (!gameState) {
      logger.warn('Action on non-existent game', { gameId, userId, action });
      return false;
    }

    try {
      const player = gameState.players.find(p => p.userId === userId);
      if (!player || !player.isAlive) {
        logger.warn('Action attempt by invalid player', {
          gameId,
          userId,
          playerFound: !!player,
          isAlive: player?.isAlive,
          actionType: action.type
        });
        return false;
      }

      // ✅ ANTI-SPAM: Verificar se já agiu
      if (player.hasActed && gameState.phase === GamePhase.NIGHT) {
        logger.warn('Player already acted this night - blocking spam', {
          gameId,
          playerId: player.id,
          actionType: action.type,
          hasActed: player.hasActed
        });

        if (this.sendToUser) {
          this.sendToUser(player.userId, 'action-failed', {
            actionType: action.type,
            error: 'Você já realizou sua ação nesta noite'
          });
        }
        return false;
      }

      logger.info('Processing player action', {
        gameId,
        userId,
        playerId: player.id,
        username: player.username,
        actionType: action.type,
        targetId: action.targetId,
        gamePhase: gameState.phase,
        gameDay: gameState.day,
        playerRole: player.role,
        playerHasActed: player.hasActed,
        nightActionsCount: gameState.nightActions.length
      });

      const ActionManager = (await import('./ActionManager')).ActionManager;
      const actionManager = new ActionManager(gameState);

      const result = await actionManager.performAction(player.id, action);

      if (result.success) {
        logger.info('Player action processed successfully', {
          gameId,
          playerId: player.id,
          userId: player.userId,
          actionType: action.type,
          targetId: action.targetId,
          result,
          nightActionsAfter: gameState.nightActions.length
        });

        if (this.sendToUser) {
          this.sendToUser(player.userId, 'action-confirmed', {
            actionType: action.type,
            message: result.message || 'Ação registrada com sucesso',
            data: result.data
          });
        }

        if (gameState.phase === GamePhase.NIGHT) {
          await this.broadcastGameState(gameId);
        }

        return true;
      } else {
        logger.warn('Player action failed validation', {
          gameId,
          playerId: player.id,
          actionType: action.type,
          errors: result.errors,
          message: result.message
        });

        if (this.sendToUser) {
          this.sendToUser(player.userId, 'action-failed', {
            actionType: action.type,
            error: result.message || 'Falha ao processar ação',
            errors: result.errors
          });
        }

        return false;
      }
    } catch (error) {
      logger.error('Error performing player action',
        error instanceof Error ? error : new Error('Unknown action error'),
        { gameId, userId, action }
      );

      const player = gameState.players.find(p => p.userId === userId);
      if (player && this.sendToUser) {
        this.sendToUser(player.userId, 'action-failed', {
          actionType: action.type,
          error: 'Erro interno ao processar ação'
        });
      }

      return false;
    }
  }

  //====================================================================
  // PHASE MANAGEMENT - ✅ FLUXO CORRETO (DIA 1 SEM VOTAÇÃO)
  //====================================================================
  async nextPhase(gameId: string): Promise<void> {
    const gameState = this.games.get(gameId);
    if (!gameState) return;

    const currentPhase = gameState.phase;
    const currentDay = gameState.day;

    try {
      switch (currentPhase) {
        case GamePhase.DAY:
          // ✅ PRIMEIRO DIA: vai direto para noite (sem votação)
          if (currentDay === 1) {
            await this.changePhase(gameState, GamePhase.NIGHT, gameState.config.nightDuration);
          } else {
            // Dias subsequentes: vai para votação
            await this.changePhase(gameState, GamePhase.VOTING, gameState.config.votingDuration);
          }
          break;

        case GamePhase.NIGHT:
          await this.processNightResults(gameState);
          await this.changePhase(gameState, GamePhase.DAY, gameState.config.dayDuration);
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

      await this.broadcastGameState(gameId);
      await this.checkWinCondition(gameId);
    } catch (error) {
      logger.error('Error during phase transition', error instanceof Error ? error : new Error('Unknown phase error'), {
        gameId,
        currentPhase,
      });
    }
  }

  //====================================================================
  // PHASE TRANSITION HELPERS
  //====================================================================
  private async changePhase(gameState: GameState, newPhase: GamePhase, duration: number): Promise<void> {
    const oldPhase = gameState.phase;
    gameState.changePhase(newPhase, duration);

    let phaseMessage = '';
    const durationText = `(${duration / 1000}s)`;

    switch (newPhase) {
      case GamePhase.DAY:
        phaseMessage = `🌅 Dia ${gameState.day} começou! Hora de discutir e investigar. ${durationText}`;
        break;
      case GamePhase.VOTING:
        phaseMessage = `🗳️ Hora da votação! Escolham quem será executado. ${durationText}`;
        break;
      case GamePhase.NIGHT:
        phaseMessage = `🌙 Noite ${gameState.day} chegou... Os poderes especiais acordam. ${durationText}`;
        break;
    }

    if (phaseMessage) {
      this.broadcastSystemMessage(gameState.gameId, phaseMessage, 'system');
    }

    setTimeout(() => {
      this.nextPhase(gameState.gameId);
    }, duration);

    this.emitGameEvent(gameState.gameId, 'phase:changed', {
      gameId: gameState.gameId,
      phase: newPhase,
      duration,
      timeLeft: duration,
      day: gameState.day,
    });

    logger.info('Phase changed with system message', {
      gameId: gameState.gameId,
      from: oldPhase,
      to: newPhase,
      day: gameState.day,
      duration: `${duration / 1000}s`
    });
  }

  // ✅ CORRIGIDO: processNightResults com FEEDBACK DAS AÇÕES
  private async processNightResults(gameState: GameState): Promise<void> {
    logger.info('Processing night results with feedback', {
      gameId: gameState.gameId,
      nightActionsCount: gameState.nightActions.length,
      nightActions: gameState.nightActions.map(a => ({
        type: a.type,
        playerId: a.playerId,
        targetId: a.targetId
      }))
    });

    const deaths: string[] = [];
    const protections: string[] = [];

    // Primeiro, aplicar proteções
    gameState.nightActions.forEach(action => {
      if (action.type === 'PROTECT' && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target) {
          target.protect();
          protections.push(action.targetId);

          // ✅ FEEDBACK para o Doctor
          this.sendActionResult(gameState.gameId, action.playerId, 'PROTECT',
            `🛡️ Você protegeu ${target.username} com sucesso!`);

          logger.info('Protection applied with feedback', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username
          });
        }
      }
    });

    // Segundo, processar investigações
    gameState.nightActions.forEach(action => {
      if (action.type === 'INVESTIGATE' && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target && target.role) {
          // ✅ LÓGICA DE INVESTIGAÇÃO
          const isSuspicious = target.role === 'WEREWOLF' || target.role === 'WEREWOLF_KING' || target.role === 'SERIAL_KILLER';
          const result = isSuspicious ? 'SUSPEITO' : 'INOCENTE';

          // ✅ FEEDBACK para o Sheriff
          this.sendActionResult(gameState.gameId, action.playerId, 'INVESTIGATE',
            `🔍 Investigação de ${target.username}: ${result} ${isSuspicious ? '⚠️' : '✅'}`);

          logger.info('Investigation completed with feedback', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username,
            result
          });
        }
      }
    });

    // Terceiro, processar ataques
    gameState.nightActions.forEach(action => {
      if ((action.type === 'WEREWOLF_KILL' || action.type === 'KILL') && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target && target.isAlive && !target.isProtected) {
          target.kill('NIGHT_KILL');
          deaths.push(action.targetId);

          logger.info('Night kill applied', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username,
            killerType: action.type
          });
        } else if (target && target.isProtected) {
          logger.info('Attack blocked by protection', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username
          });
        }
      }
    });

    gameState.nightActions.forEach(action => {
      if (action.type === 'VIGILANTE_KILL' && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target && target.isAlive && !target.isProtected) {
          target.kill('VIGILANTE');
          deaths.push(action.targetId);

          logger.info('Vigilante kill applied', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username
          });
        } else if (target && target.isProtected) {
          logger.info('Vigilante attack blocked by protection', {
            gameId: gameState.gameId,
            targetId: action.targetId,
            targetName: target.username
          });
        }
      }
    });

    // Processar ataques do Serial Killer
    gameState.nightActions.forEach(action => {
      if (action.type === 'SERIAL_KILL' && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target && target.isAlive) {
          // Serial Killer ignora proteção na primeira noite
          const isFirstNight = gameState.day === 1;
          if (!target.isProtected || isFirstNight) {
            target.kill('SERIAL_KILLER');
            deaths.push(action.targetId);

            logger.info('Serial killer kill applied', {
              gameId: gameState.gameId,
              targetId: action.targetId,
              targetName: target.username,
              bypassedProtection: isFirstNight && target.isProtected
            });
          } else {
            logger.info('Serial killer attack blocked by protection', {
              gameId: gameState.gameId,
              targetId: action.targetId,
              targetName: target.username
            });
          }
        }
      }
    });

    // Enviar mensagens de sistema sobre os resultados
    if (deaths.length > 0) {
      deaths.forEach(playerId => {
        const player = gameState.getPlayer(playerId);
        if (player) {
          this.broadcastSystemMessage(gameState.gameId,
            `💀 ${player.username} foi encontrado morto pela manhã!`,
            'system'
          );
        }
      });
    } else {
      this.broadcastSystemMessage(gameState.gameId,
        "🌅 Ninguém morreu durante a noite. A vila teve uma noite tranquila.",
        'system'
      );
    }

    // Limpar ações da noite
    gameState.nightActions = [];

    // Remover proteções (elas duram apenas uma noite)
    gameState.players.forEach(player => {
      if (player.isProtected) {
        player.removeProtection();
      }
    });

    logger.info('Night results processed completely with feedback', {
      gameId: gameState.gameId,
      deathsCount: deaths.length,
      protectionsCount: protections.length,
      remainingActions: gameState.nightActions.length
    });
  }

  private async processVotingResults(gameState: GameState): Promise<void> {
    const result = gameState.getMostVotedPlayer();

    if (result) {
      const player = gameState.getPlayer(result.playerId);
      if (player && player.role) {
        if (player.role === Role.JESTER) {
          gameState.endGame(Faction.NEUTRAL, [player.id]);

          this.broadcastSystemMessage(gameState.gameId,
            `🎭 ${player.username} era o BOBO DA CORTE e venceu ao ser executado!`,
            'system'
          );

          this.emitGameEvent(gameState.gameId, 'jester:wins', {
            gameId: gameState.gameId,
            jesterId: player.id,
            jesterName: player.username,
          });

          await this.endGame(gameState.gameId, 'Jester executed and wins');
          return;
        }

        player.kill('EXECUTION');

        this.broadcastSystemMessage(gameState.gameId,
          `⚖️ ${player.username} foi executado pela vila! Ele era: ${player.role}`,
          'system'
        );

        gameState.addEvent('PLAYER_EXECUTED', {
          playerId: player.id,
          playerName: player.username,
          role: player.role,
          votes: result.votes,
        });

        logger.info('Player executed with role reveal', {
          gameId: gameState.gameId,
          playerId: player.id,
          playerName: player.username,
          role: player.role,
          votes: result.votes
        });
      }
    } else {
      this.broadcastSystemMessage(gameState.gameId,
        "🤝 Empate na votação! Ninguém foi executado hoje.",
        'system'
      );

      gameState.addEvent('NO_EXECUTION', {
        reason: 'No majority or tie vote',
      });

      logger.info('No execution - tie vote', {
        gameId: gameState.gameId,
        voteCounts: Object.fromEntries(gameState.getVoteCounts())
      });
    }
  }

  //====================================================================
  // WIN CONDITION CHECKING
  //====================================================================
  private async checkWinCondition(gameId: string): Promise<void> {
    const gameState = this.games.get(gameId);
    if (!gameState || gameState.status !== 'PLAYING') return;

    const alivePlayers = gameState.getAlivePlayers();
    const winCondition = WinConditionCalculator.calculateWinCondition(
      alivePlayers.map(p => ({ playerId: p.id, role: p.role! }))
    );

    if (winCondition.hasWinner) {
      await this.endGame(gameId);
    }
  }

  //====================================================================
  // VOTING SYSTEM
  //====================================================================
  async castVote(gameId: string, voterId: string, targetId: string): Promise<boolean> {
    const gameState = this.games.get(gameId);
    if (!gameState) return false;

    try {
      const voter = gameState.players.find(p => p.userId === voterId);
      if (!voter) {
        logger.warn('Vote attempt by non-existent player', { gameId, voterId });
        return false;
      }

      const success = gameState.addVote(voter.id, targetId);

      if (success) {
        this.emitGameEvent(gameId, 'vote:cast', {
          gameId,
          voterId: voter.id,
          targetId,
          voteCounts: Object.fromEntries(gameState.getVoteCounts()),
        });

        await this.broadcastGameState(gameId);

        logger.info('Vote cast successfully', {
          gameId,
          voterId: voter.id,
          voterName: voter.username,
          targetId
        });
      }

      return success;
    } catch (error) {
      logger.error('Error casting vote',
        error instanceof Error ? error : new Error('Unknown vote error'),
        { gameId, voterId, targetId }
      );
      return false;
    }
  }

  async removeVote(gameId: string, voterId: string): Promise<boolean> {
    const gameState = this.games.get(gameId);
    if (!gameState) return false;

    try {
      const voter = gameState.players.find(p => p.userId === voterId);
      if (!voter) {
        logger.warn('Unvote attempt by non-existent player', { gameId, voterId });
        return false;
      }

      const success = gameState.removeVote(voter.id);

      if (success) {
        this.emitGameEvent(gameId, 'vote:removed', {
          gameId,
          voterId: voter.id,
          voteCounts: Object.fromEntries(gameState.getVoteCounts()),
        });

        await this.broadcastGameState(gameId);

        logger.info('Vote removed successfully', {
          gameId,
          voterId: voter.id,
          voterName: voter.username
        });
      }

      return success;
    } catch (error) {
      logger.error('Error removing vote',
        error instanceof Error ? error : new Error('Unknown unvote error'),
        { gameId, voterId }
      );
      return false;
    }
  }

  //====================================================================
  // EVENT SYSTEM
  //====================================================================
  onGameEvent(gameId: string, event: string, handler: (data: any) => void): void {
    const gameHandlers = this.eventHandlers.get(gameId);
    if (!gameHandlers) return;

    if (!gameHandlers.has(event)) {
      gameHandlers.set(event, []);
    }

    gameHandlers.get(event)!.push(handler);
  }

  private emitGameEvent(gameId: string, event: string, data: any): void {
    const gameHandlers = this.eventHandlers.get(gameId);
    if (!gameHandlers) return;

    const handlers = gameHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error('Error in game event handler', error instanceof Error ? error : new Error('Unknown handler error'), {
            gameId,
            event,
          });
        }
      });
    }
  }

  //====================================================================
  // UTILITY METHODS
  //====================================================================
  private generateGameResults(gameState: GameState): GameResults {
    const results: GameResults = {
      gameId: gameState.gameId,
      roomId: gameState.roomId,
      duration: gameState.finishedAt
        ? gameState.finishedAt.getTime() - (gameState.startedAt?.getTime() || 0)
        : 0,
      totalDays: gameState.day,

      ...(gameState.winningFaction && { winningFaction: gameState.winningFaction }),

      winningPlayers: gameState.winningPlayers,
      players: gameState.players.map(player => ({
        id: player.id,
        userId: player.userId,
        username: player.username,
        role: player.role ?? Role.VILLAGER,
        faction: player.faction ?? Faction.TOWN,
        survived: player.isAlive,
        won: gameState.winningPlayers.includes(player.id),
        eliminationReason: player.eliminationReason ?? '',
        killedBy: player.killedBy ?? '',
      })),
      events: gameState.events,
    };

    return results;
  }

  //====================================================================
  // ADMINISTRATIVE METHODS
  //====================================================================
  getActiveGamesCount(): number {
    return Array.from(this.games.values())
      .filter(game => game.status === 'PLAYING').length;
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  async getGamesByRoom(roomId: string): Promise<GameState[]> {
    const games = Array.from(this.games.values())
      .filter(game => game.roomId === roomId);
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
      gameId,
      status: gameState.status,
      phase: gameState.phase,
      day: gameState.day,
      playerCount: gameState.players.length,
      aliveCount: gameState.getAlivePlayers().length,
      spectatorCount: gameState.spectators.length,
      timeLeft: gameState.timeLeft,
      events: gameState.events.length,
    };
  }

  //====================================================================
  // CLEANUP
  //====================================================================
  async cleanup(): Promise<void> {
    this.games.clear();
    this.eventHandlers.clear();

    logger.info('GameEngine cleanup completed');
  }
}