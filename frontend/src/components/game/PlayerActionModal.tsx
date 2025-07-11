import React from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/context/ThemeContext';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { Player, Role, GamePhase } from '@/types';

// =============================================================================
// TYPES
// =============================================================================
interface PlayerActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetPlayer: Player | null;
}

interface RoleAction {
    type: string;
    label: string;
    description: string;
    icon: string;
}

// =============================================================================
// ROLE ACTION MAPPINGS
// =============================================================================
const getRoleAction = (role: Role | undefined): RoleAction | null => {
    if (!role) return null;

    switch (role) {
        case Role.SHERIFF:
            return {
                type: 'INVESTIGATE',
                label: 'Investigar',
                description: 'Descubra se este jogador é suspeito',
                icon: '🔍'
            };
        case Role.DOCTOR:
            return {
                type: 'PROTECT',
                label: 'Proteger',
                description: 'Proteja este jogador de ataques',
                icon: '🛡️'
            };
        case Role.WEREWOLF:
            return {
                type: 'WEREWOLF_KILL',
                label: 'Atacar',
                description: 'Elimine este jogador durante a noite',
                icon: '🐺'
            };
        case Role.VIGILANTE:
            return {
                type: 'VIGILANTE_KILL',
                label: 'Eliminar',
                description: 'Execute este jogador por justiça',
                icon: '⚔️'
            };
        case Role.SERIAL_KILLER:
            return {
                type: 'SERIAL_KILL',
                label: 'Assassinar',
                description: 'Elimine este jogador silenciosamente',
                icon: '🔪'
            };
        default:
            return null;
    }
};

// =============================================================================
// COMPONENT
// =============================================================================
export default function PlayerActionModal({
    isOpen,
    onClose,
    targetPlayer,
}: PlayerActionModalProps) {
    const { gameState, me } = useGame();
    const { sendMessage } = useSocket();
    const { playSound } = useTheme();

    // =============================================================================
    // EARLY RETURNS
    // =============================================================================
    if (!isOpen || !targetPlayer || !gameState || !me) {
        return null;
    }

    // =============================================================================
    // DETERMINE ACTION TYPE
    // =============================================================================
    const isVotingPhase = gameState.phase === GamePhase.VOTING;
    const isNightPhase = gameState.phase === GamePhase.NIGHT;
    const roleAction = getRoleAction(me.role);

    // Can't target self for most actions (except protection)
    const isSelfTarget = targetPlayer.id === me.id;
    const canTargetSelf = roleAction?.type === 'PROTECT';

    // =============================================================================
    // ACTION HANDLERS
    // =============================================================================
    const handleVote = () => {
        playSound('button_click');
        const success = sendMessage('vote', { targetId: targetPlayer.id });

        if (success) {
            playSound('action_success');
            onClose();
        } else {
            playSound('error');
        }
    };

    const handleRoleAction = () => {
        if (!roleAction) return;

        playSound('button_click');
        const success = sendMessage('game-action', {
            type: roleAction.type,
            targetId: targetPlayer.id
        });

        if (success) {
            playSound('action_success');
            onClose();
        } else {
            playSound('error');
        }
    };

    const handleCancel = () => {
        playSound('button_click');
        onClose();
    };

    // =============================================================================
    // RENDER VOTING ACTION
    // =============================================================================
    if (isVotingPhase) {
        // Can't vote for yourself
        if (isSelfTarget) {
            return (
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    title="❌ Ação Inválida"
                    variant="error"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🚫</div>
                            <p className="text-white/90">
                                Você não pode votar em si mesmo!
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <Button variant="secondary" onClick={handleCancel}>
                                Entendi
                            </Button>
                        </div>
                    </div>
                </Modal>
            );
        }

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="🗳️ Confirmar Voto"
                variant="medieval"
                size="sm"
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="text-6xl mb-4">⚖️</div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Votar em {targetPlayer.username}?
                        </h3>
                        <p className="text-white/80">
                            Esta ação enviará seu voto para eliminar este jogador durante o julgamento.
                        </p>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleVote}>
                            Confirmar Voto
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // =============================================================================
    // RENDER NIGHT ACTION
    // =============================================================================
    if (isNightPhase && roleAction) {
        // Check if can target self
        if (isSelfTarget && !canTargetSelf) {
            return (
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    title="❌ Ação Inválida"
                    variant="error"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🚫</div>
                            <p className="text-white/90">
                                Você não pode usar sua habilidade em si mesmo!
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <Button variant="secondary" onClick={handleCancel}>
                                Entendi
                            </Button>
                        </div>
                    </div>
                </Modal>
            );
        }

        // Check if already acted
        if (me.hasActed) {
            return (
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    title="⏰ Ação Já Realizada"
                    variant="medieval"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-6xl mb-4">✅</div>
                            <p className="text-white/90">
                                Você já realizou sua ação nesta noite!
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <Button variant="secondary" onClick={handleCancel}>
                                Entendi
                            </Button>
                        </div>
                    </div>
                </Modal>
            );
        }

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`${roleAction.icon} Usar Habilidade`}
                variant="game"
                size="sm"
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="text-6xl mb-4">{roleAction.icon}</div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {roleAction.label} {targetPlayer.username}?
                        </h3>
                        <p className="text-white/80 mb-4">
                            {roleAction.description}
                        </p>

                        {/* Special warning for kill actions */}
                        {(roleAction.type.includes('KILL')) && (
                            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                                <p className="text-red-300 text-sm">
                                    ⚠️ Esta ação eliminará o jogador permanentemente!
                                </p>
                            </div>
                        )}

                        {/* Special info for protection */}
                        {roleAction.type === 'PROTECT' && (
                            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
                                <p className="text-blue-300 text-sm">
                                    🛡️ Este jogador ficará protegido contra ataques nesta noite.
                                </p>
                            </div>
                        )}

                        {/* Special info for investigation */}
                        {roleAction.type === 'INVESTIGATE' && (
                            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-4">
                                <p className="text-yellow-300 text-sm">
                                    🔍 Você descobrirá se este jogador é "SUSPEITO" ou "NÃO SUSPEITO".
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button
                            variant={roleAction.type.includes('KILL') ? 'danger' : 'primary'}
                            onClick={handleRoleAction}
                        >
                            {roleAction.label}
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // =============================================================================
    // NO VALID ACTION
    // =============================================================================
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ℹ️ Nenhuma Ação Disponível"
            variant="default"
            size="sm"
        >
            <div className="space-y-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">💤</div>
                    <p className="text-white/90">
                        {isNightPhase
                            ? "Você não possui habilidades para usar durante a noite."
                            : "Nenhuma ação disponível nesta fase do jogo."
                        }
                    </p>
                </div>
                <div className="flex justify-center">
                    <Button variant="secondary" onClick={handleCancel}>
                        Entendi
                    </Button>
                </div>
            </div>
        </Modal>
    );
}