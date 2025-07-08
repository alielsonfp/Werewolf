// 🐺 LOBISOMEM ONLINE - Action Manager (CORRIGIDO DEFINITIVAMENTE)
import { GameState, Player } from './Game';
import { ROLE_CONFIGURATIONS } from './RoleSystem';
import type { Role, Faction, GamePhase, GameStatus, GameConfig} from '@/types';
import { logger } from '@/utils/logger';

//====================================================================
// ACTION INTERFACES (CORRIGIDAS PARA exactOptionalPropertyTypes)
//====================================================================
export interface GameAction {
    id: string;
    playerId: string;
    type: string;
    targetId?: string; // Opcional, pode não existir
    data?: any;
    timestamp: Date;
    phase: string;
    day: number;
    priority: number;
    isValid: boolean;
    processed: boolean;
}

export interface ActionResult {
    success: boolean;
    actionId: string;
    message?: string;
    data?: any;
    errors?: string[];
}

// CORREÇÃO: Interface para NightAction que aceita targetId opcional
export interface NightAction {
    playerId: string;
    type: string;
    targetId?: string; // CORREÇÃO: Opcional, não undefined explícito
    data?: any;
    priority: number;
}

//====================================================================
// ACTION MANAGER CLASS - CORRIGIDA PARA exactOptionalPropertyTypes
//====================================================================
export class ActionManager {
    private gameState: GameState;
    private pendingActions = new Map<string, GameAction>();
    private processedActions = new Map<string, GameAction>();

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    //====================================================================
    // ACTION SUBMISSION
    //====================================================================
    async performAction(playerId: string, actionData: any): Promise<ActionResult> {
        try {
            // Validate player
            const player = this.gameState.getPlayer(playerId);
            if (!player) {
                return {
                    success: false,
                    actionId: '',
                    message: 'Jogador não encontrado',
                    errors: ['PLAYER_NOT_FOUND'],
                };
            }

            // Validate basic requirements
            const validation = this.validateAction(player, actionData);
            if (!validation.success) {
                return validation;
            }

            // Create action
            const action = this.createAction(player, actionData);

            // Process action based on phase
            if (this.gameState.phase === 'NIGHT') {
                return await this.processNightAction(action);
            } else if (this.gameState.phase === 'VOTING') {
                return await this.processVotingAction(action);
            } else {
                return {
                    success: false,
                    actionId: action.id,
                    message: 'Ações não permitidas nesta fase',
                    errors: ['INVALID_PHASE'],
                };
            }

        } catch (error) {
            logger.error('Error performing action', error instanceof Error ? error : new Error('Unknown action error'), {
                playerId,
                actionData,
                gameId: this.gameState.gameId,
            });

            return {
                success: false,
                actionId: '',
                message: 'Erro interno ao processar ação',
                errors: ['INTERNAL_ERROR'],
            };
        }
    }

    //====================================================================
    // ACTION VALIDATION
    //====================================================================
    private validateAction(player: Player, actionData: any): ActionResult {
        // Check if player is alive
        if (!player.isAlive && actionData.type !== 'SPECTATE') {
            return {
                success: false,
                actionId: '',
                message: 'Jogadores mortos não podem realizar ações',
                errors: ['PLAYER_DEAD'],
            };
        }

        // Check if player can act
        if (!player.canAct() && actionData.type !== 'VOTE' && actionData.type !== 'UNVOTE') {
            return {
                success: false,
                actionId: '',
                message: 'Você não pode realizar ações neste momento',
                errors: ['CANNOT_ACT'],
            };
        }

        // Check action type validity
        if (!this.isValidActionType(actionData.type)) {
            return {
                success: false,
                actionId: '',
                message: 'Tipo de ação inválido',
                errors: ['INVALID_ACTION_TYPE'],
            };
        }

        // Check phase-specific permissions
        if (!this.canPerformActionInPhase(player.role, actionData.type, this.gameState.phase)) {
            return {
                success: false,
                actionId: '',
                message: 'Ação não permitida nesta fase',
                errors: ['INVALID_PHASE_FOR_ACTION'],
            };
        }

        // Check if target is valid (if action requires target)
        if (this.requiresTarget(actionData.type)) {
            const targetValidation = this.validateTarget(player, actionData);
            if (!targetValidation.success) {
                return targetValidation;
            }
        }

        return { success: true, actionId: '' };
    }

    private validateTarget(player: Player, actionData: any): ActionResult {
        if (!actionData.targetId) {
            return {
                success: false,
                actionId: '',
                message: 'Alvo é obrigatório para esta ação',
                errors: ['TARGET_REQUIRED'],
            };
        }

        const target = this.gameState.getPlayer(actionData.targetId);
        if (!target) {
            return {
                success: false,
                actionId: '',
                message: 'Alvo não encontrado',
                errors: ['TARGET_NOT_FOUND'],
            };
        }

        // Check if target is alive (for most actions)
        if (!target.isAlive && !['INVESTIGATE'].includes(actionData.type)) {
            return {
                success: false,
                actionId: '',
                message: 'Não é possível ter como alvo um jogador morto',
                errors: ['TARGET_DEAD'],
            };
        }

        // Check self-targeting rules
        if (player.id === target.id && !this.allowsSelfTarget(actionData.type)) {
            return {
                success: false,
                actionId: '',
                message: 'Você não pode ter a si mesmo como alvo',
                errors: ['CANNOT_SELF_TARGET'],
            };
        }

        // Role-specific target validations
        const roleValidation = this.validateRoleSpecificTarget(player, target, actionData);
        if (!roleValidation.success) {
            return roleValidation;
        }

        return { success: true, actionId: '' };
    }

    private validateRoleSpecificTarget(player: Player, target: Player, actionData: any): ActionResult {
        switch (actionData.type) {
            case 'PROTECT':
                // Doctor can't protect same person twice in a row
                if (!target.canBeProtectedByDoctor) {
                    return {
                        success: false,
                        actionId: '',
                        message: 'Não é possível proteger a mesma pessoa duas noites seguidas',
                        errors: ['CANNOT_PROTECT_CONSECUTIVELY'],
                    };
                }
                break;

            case 'WEREWOLF_KILL':
                // Werewolves can't kill other werewolves
                if (target.faction === 'WEREWOLF') {
                    return {
                        success: false,
                        actionId: '',
                        message: 'Lobisomens não podem atacar outros lobisomens',
                        errors: ['CANNOT_KILL_WEREWOLF'],
                    };
                }
                break;

            case 'VOTE':
                // Can't vote for yourself
                if (player.id === target.id) {
                    return {
                        success: false,
                        actionId: '',
                        message: 'Você não pode votar em si mesmo',
                        errors: ['CANNOT_VOTE_SELF'],
                    };
                }
                break;
        }

        return { success: true, actionId: '' };
    }

    //====================================================================
    // ACTION CREATION
    //====================================================================
    private createAction(player: Player, actionData: any): GameAction {
        const actionId = `${this.gameState.gameId}-${player.id}-${actionData.type}-${Date.now()}`;

        const action: GameAction = {
            id: actionId,
            playerId: player.id,
            type: actionData.type,
            // CORREÇÃO: Só incluir targetId se existir, evitando undefined explícito
            ...(actionData.targetId && { targetId: actionData.targetId }),
            data: actionData.data || {},
            timestamp: new Date(),
            phase: this.gameState.phase,
            day: this.gameState.day,
            priority: this.getActionPriority(actionData.type),
            isValid: true,
            processed: false,
        };

        return action;
    }

    //====================================================================
    // NIGHT ACTIONS
    //====================================================================
    private async processNightAction(action: GameAction): Promise<ActionResult> {
        const player = this.gameState.getPlayer(action.playerId);
        if (!player) {
            return {
                success: false,
                actionId: action.id,
                message: 'Jogador não encontrado',
                errors: ['PLAYER_NOT_FOUND'],
            };
        }

        // Mark player as having acted
        player.performAction(action.type, action.targetId);

        // Store action for processing at end of night
        this.pendingActions.set(action.id, action);

        // CORREÇÃO: Criar NightAction corretamente, só incluindo targetId se existir
        const nightAction: NightAction = {
            playerId: action.playerId,
            type: action.type,
            // CORREÇÃO: Só incluir targetId se realmente existir
            ...(action.targetId && { targetId: action.targetId }),
            data: action.data,
            priority: action.priority,
        };

        this.gameState.nightActions.push(nightAction);

        // Log the action
        logger.info('Night action queued', {
            gameId: this.gameState.gameId,
            actionId: action.id,
            playerId: action.playerId,
            type: action.type,
            targetId: action.targetId,
        });

        // Send confirmation to player
        this.gameState.addEvent('ACTION_SUBMITTED', {
            actionId: action.id,
            type: action.type,
            message: this.getActionConfirmationMessage(action.type),
        }, [action.playerId]);

        return {
            success: true,
            actionId: action.id,
            message: this.getActionConfirmationMessage(action.type),
        };
    }

    //====================================================================
    // VOTING ACTIONS
    //====================================================================
    private async processVotingAction(action: GameAction): Promise<ActionResult> {
        if (action.type === 'VOTE') {
            return await this.processVote(action);
        } else if (action.type === 'UNVOTE') {
            return await this.processUnvote(action);
        } else {
            return {
                success: false,
                actionId: action.id,
                message: 'Ação não permitida durante votação',
                errors: ['INVALID_VOTING_ACTION'],
            };
        }
    }

    private async processVote(action: GameAction): Promise<ActionResult> {
        if (!action.targetId) {
            return {
                success: false,
                actionId: action.id,
                message: 'Alvo é obrigatório para votação',
                errors: ['TARGET_REQUIRED'],
            };
        }

        const success = this.gameState.addVote(action.playerId, action.targetId);

        if (success) {
            this.processedActions.set(action.id, action);

            const target = this.gameState.getPlayer(action.targetId);
            logger.info('Vote cast', {
                gameId: this.gameState.gameId,
                voterId: action.playerId,
                targetId: action.targetId,
                targetName: target?.username,
            });

            return {
                success: true,
                actionId: action.id,
                message: `Voto registrado em ${target?.username}`,
                data: {
                    targetName: target?.username,
                    voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
                },
            };
        } else {
            return {
                success: false,
                actionId: action.id,
                message: 'Falha ao registrar voto',
                errors: ['VOTE_FAILED'],
            };
        }
    }

    private async processUnvote(action: GameAction): Promise<ActionResult> {
        const success = this.gameState.removeVote(action.playerId);

        if (success) {
            this.processedActions.set(action.id, action);

            logger.info('Vote removed', {
                gameId: this.gameState.gameId,
                voterId: action.playerId,
            });

            return {
                success: true,
                actionId: action.id,
                message: 'Voto removido',
                data: {
                    voteCounts: Object.fromEntries(this.gameState.getVoteCounts()),
                },
            };
        } else {
            return {
                success: false,
                actionId: action.id,
                message: 'Falha ao remover voto',
                errors: ['UNVOTE_FAILED'],
            };
        }
    }

    //====================================================================
    // ACTION VALIDATION HELPERS
    //====================================================================
    private isValidActionType(type: string): boolean {
        const validTypes = [
            'INVESTIGATE', 'PROTECT', 'WEREWOLF_KILL', 'VIGILANTE_KILL',
            'SERIAL_KILL', 'VOTE', 'UNVOTE', 'SPECTATE'
        ];
        return validTypes.includes(type);
    }

    private canPerformActionInPhase(role: Role | undefined, actionType: string, phase: string): boolean {
        if (!role) return false;

        const roleConfig = ROLE_CONFIGURATIONS[role];

        // Special cases for voting
        if (actionType === 'VOTE' || actionType === 'UNVOTE') {
            return phase === 'VOTING';
        }

        // Night actions
        if (phase === 'NIGHT') {
            return roleConfig.actsDuring.includes('NIGHT') && this.isNightAction(actionType);
        }

        return false;
    }

    private isNightAction(actionType: string): boolean {
        const nightActions = ['INVESTIGATE', 'PROTECT', 'WEREWOLF_KILL', 'VIGILANTE_KILL', 'SERIAL_KILL'];
        return nightActions.includes(actionType);
    }

    private requiresTarget(actionType: string): boolean {
        const targetActions = ['INVESTIGATE', 'PROTECT', 'WEREWOLF_KILL', 'VIGILANTE_KILL', 'SERIAL_KILL', 'VOTE'];
        return targetActions.includes(actionType);
    }

    private allowsSelfTarget(actionType: string): boolean {
        const selfTargetActions = ['PROTECT']; // Doctor can protect themselves
        return selfTargetActions.includes(actionType);
    }

    private getActionPriority(actionType: string): number {
        const priorities: Record<string, number> = {
            'PROTECT': 1,        // Protections first
            'INVESTIGATE': 3,    // Investigations
            'WEREWOLF_KILL': 5,  // Werewolf kills
            'VIGILANTE_KILL': 4, // Vigilante kills
            'SERIAL_KILL': 6,    // Serial killer last
            'VOTE': 1,           // Votes are immediate
            'UNVOTE': 1,         // Unvotes are immediate
        };

        return priorities[actionType] || 999;
    }

    private getActionConfirmationMessage(actionType: string): string {
        const messages: Record<string, string> = {
            'INVESTIGATE': 'Investigação programada para esta noite',
            'PROTECT': 'Proteção programada para esta noite',
            'WEREWOLF_KILL': 'Ataque programado para esta noite',
            'VIGILANTE_KILL': 'Execução programada para esta noite',
            'SERIAL_KILL': 'Assassinato programado para esta noite',
            'VOTE': 'Voto registrado',
            'UNVOTE': 'Voto removido',
        };

        return messages[actionType] || 'Ação programada';
    }

    //====================================================================
    // ACTION PROCESSING UTILITIES
    //====================================================================
    getAllPendingActions(): GameAction[] {
        return Array.from(this.pendingActions.values())
            .sort((a, b) => a.priority - b.priority);
    }

    clearPendingActions(): void {
        // Move pending to processed
        this.pendingActions.forEach((action, id) => {
            action.processed = true;
            this.processedActions.set(id, action);
        });

        this.pendingActions.clear();
    }

    getActionHistory(playerId?: string): GameAction[] {
        const allActions = Array.from(this.processedActions.values());

        if (playerId) {
            return allActions.filter(action => action.playerId === playerId);
        }

        return allActions;
    }

    //====================================================================
    // STATISTICS AND MONITORING
    //====================================================================
    getActionStats(): {
        total: number;
        pending: number;
        processed: number;
        byType: Record<string, number>;
        byPhase: Record<string, number>;
    } {
        const allActions = [
            ...Array.from(this.pendingActions.values()),
            ...Array.from(this.processedActions.values())
        ];

        const stats = {
            total: allActions.length,
            pending: this.pendingActions.size,
            processed: this.processedActions.size,
            byType: {} as Record<string, number>,
            byPhase: {} as Record<string, number>,
        };

        allActions.forEach(action => {
            stats.byType[action.type] = (stats.byType[action.type] || 0) + 1;
            stats.byPhase[action.phase] = (stats.byPhase[action.phase] || 0) + 1;
        });

        return stats;
    }

    //====================================================================
    // CLEANUP
    //====================================================================
    cleanup(): void {
        this.pendingActions.clear();
        this.processedActions.clear();
        logger.info('ActionManager cleanup completed');
    }

    
}