// 🐺 LOBISOMEM ONLINE - Game Engine (FASE 1 - CORREÇÃO CRÍTICA)
import { GameState, Player } from './Game';
import { RoleDistributor, WinConditionCalculator } from './RoleSystem';
import { Role, Faction, GamePhase } from '@/utils/constants';
import type { GameConfig, IGameEngine, GameResults, GameStatus } from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// GAME ENGINE IMPLEMENTATION - FASE 1 CORRIGIDA
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
  // GAME LIFECYCLE
  //====================================================================
  async createGame(hostId: string, config: GameConfig): Promise<GameState> {
    // ✅ FASE 1 - CORREÇÃO CRÍTICA: gameId padronizado e previsível
    const gameId = `game-${config.roomId}`;

    try {
      const gameState = new GameState(gameId, config, hostId);

      this.games.set(gameId, gameState);
      this.eventHandlers.set(gameId, new Map());

      logger.info('Game created with standardized gameId', {
        gameId,
        roomId: config.roomId,
        hostId,
        pattern: 'game-${roomId}'
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

  // ✅ FASE 1 - MELHORADO: startGame com logs estruturados para debugging
  async startGame(gameId: string): Promise<boolean> {
    const gameState = this.games.get(gameId);

    if (!gameState) {
      // ✅ FASE 1 - LOG MELHORADO: Mostrar gameIds disponíveis para debug
      const availableGameIds = Array.from(this.games.keys());
      logger.warn('Attempted to start non-existent game', {
        requestedGameId: gameId,
        availableGameIds,
        totalGames: this.games.size,
        pattern: 'Expected: game-${roomId}'
      });
      return false;
    }

    // ✅ FASE 1 - VALIDAÇÃO MELHORADA: Usar novo canStart() mais robusto
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

      await this.startFirstNight(gameState);

      // Enviar estado inicial para cada jogador INDIVIDUALMENTE
      await this.sendInitialGameStateToAllPlayers(gameId);

      logger.info('Game started successfully - Phase 1 implementation', {
        gameId,
        roomId: gameState.roomId,
        playerCount: players.length,
        distribution,
        hostId: gameState.hostId,
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

  // ENVIAR ESTADO INICIAL PERSONALIZADO PARA CADA JOGADOR
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

  // PERSONALIZAR ESTADO DO JOGO PARA JOGADOR ESPECÍFICO
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
  // PHASE MANAGEMENT
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
  // PHASE TRANSITION HELPERS
  //====================================================================
  private async startFirstNight(gameState: GameState): Promise<void> {
    await this.changePhase(gameState, GamePhase.NIGHT, gameState.config.nightDuration);

    gameState.addEvent('FIRST_NIGHT_STARTED', {
      message: 'A primeira noite chegou à vila. Os poderes especiais acordam...',
    });
  }

  private async changePhase(gameState: GameState, newPhase: GamePhase, duration: number): Promise<void> {
    gameState.changePhase(newPhase, duration);

    setTimeout(() => {
      this.nextPhase(gameState.gameId);
    }, duration);

    this.emitGameEvent(gameState.gameId, 'phase:changed', {
      gameId: gameState.gameId,
      phase: newPhase,
      duration,
      timeLeft: duration,
    });
  }

  private async processNightResults(gameState: GameState): Promise<void> {
    const deaths: string[] = [];

    gameState.nightActions.forEach(action => {
      if (action.type === 'WEREWOLF_KILL' && action.targetId) {
        const target = gameState.getPlayer(action.targetId);
        if (target && target.isAlive && !target.isProtected) {
          target.kill('NIGHT_KILL');
          deaths.push(action.targetId);
        }
      }
    });

    gameState.nightActions = [];

    if (deaths.length > 0) {
      deaths.forEach(playerId => {
        const player = gameState.getPlayer(playerId);
        if (player) {
          gameState.addEvent('PLAYER_DIED', {
            playerId,
            playerName: player.username,
            cause: 'NIGHT_KILL',
          });
        }
      });
    } else {
      gameState.addEvent('NO_DEATHS', {
        message: 'Ninguém morreu durante a noite.',
      });
    }
  }

  private async processVotingResults(gameState: GameState): Promise<void> {
    const result = gameState.getMostVotedPlayer();

    if (result) {
      const player = gameState.getPlayer(result.playerId);
      if (player && player.role) {
        if (player.role === Role.JESTER) {
          gameState.endGame(Faction.NEUTRAL, [player.id]);

          this.emitGameEvent(gameState.gameId, 'jester:wins', {
            gameId: gameState.gameId,
            jesterId: player.id,
            jesterName: player.username,
          });

          await this.endGame(gameState.gameId, 'Jester executed and wins');
          return;
        }

        player.kill('EXECUTION');

        gameState.addEvent('PLAYER_EXECUTED', {
          playerId: player.id,
          playerName: player.username,
          role: player.role,
          votes: result.votes,
        });
      }
    } else {
      gameState.addEvent('NO_EXECUTION', {
        reason: 'No majority or tie vote',
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

    const success = gameState.addVote(voterId, targetId);

    if (success) {
      this.emitGameEvent(gameId, 'vote:cast', {
        gameId,
        voterId,
        targetId,
        voteCounts: Object.fromEntries(gameState.getVoteCounts()),
      });
    }

    return success;
  }

  async removeVote(gameId: string, voterId: string): Promise<boolean> {
    const gameState = this.games.get(gameId);
    if (!gameState) return false;

    const success = gameState.removeVote(voterId);

    if (success) {
      this.emitGameEvent(gameId, 'vote:removed', {
        gameId,
        voterId,
        voteCounts: Object.fromEntries(gameState.getVoteCounts()),
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