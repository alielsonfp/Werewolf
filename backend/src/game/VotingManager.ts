// 🐺 LOBISOMEM ONLINE - Voting System Manager (CORRIGIDO)
// ✅ A7.2 e A7.3 - Sistema de votação completo (vote, unvote, empates, maioria)

import { GameState, Player } from './Game';
import { logger } from '@/utils/logger';
import type { Role } from '@/utils/constants';

//====================================================================
// VOTING INTERFACES
//====================================================================
export interface VoteData {
    voterId: string;
    targetId: string;
    timestamp: Date;
    day: number;
}

export interface VotingResults {
    executed: {
        playerId: string;
        playerName: string;
        role?: Role | undefined;
        votes: number;
    } | null;
    voteCounts: Record<string, number>;
    totalVotes: number;
    requiredForMajority: number;
    isTie: boolean;
    reason?: string | undefined;
}

export interface VoteCountEntry {
    playerId: string;
    playerName: string;
    votes: number;
    voters: string[];
}

//====================================================================
// VOTING MANAGER CLASS
//====================================================================
export class VotingManager {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    //====================================================================
    // ✅ A7.2 - SISTEMA DE VOTAÇÃO (vote, unvote)
    //====================================================================

    /**
     * Cast a vote for a target player
     */
    async castVote(voterId: string, targetId: string): Promise<boolean> {
        const voter = this.gameState.getPlayer(voterId);
        const target = this.gameState.getPlayer(targetId);

        // Validate voter
        if (!voter || !voter.isAlive) {
            logger.warn('Vote attempt by dead or non-existent player', {
                gameId: this.gameState.gameId,
                voterId,
            });
            return false;
        }

        // Validate target
        if (!target || !target.isAlive) {
            logger.warn('Vote attempt on dead or non-existent player', {
                gameId: this.gameState.gameId,
                voterId,
                targetId,
            });
            return false;
        }

        // Validate phase
        if (this.gameState.phase !== 'VOTING') {
            logger.warn('Vote attempt during wrong phase', {
                gameId: this.gameState.gameId,
                voterId,
                targetId,
                currentPhase: this.gameState.phase,
            });
            return false;
        }

        // Cannot vote for yourself
        if (voterId === targetId) {
            logger.warn('Self-vote attempt', {
                gameId: this.gameState.gameId,
                voterId,
            });
            return false;
        }

        // Add/update vote using GameState method
        const success = this.gameState.addVote(voterId, targetId);

        if (success) {
            // ✅ A7.6 - Evento vote
            this.gameState.addEvent('VOTE_CAST', {
                voterId,
                voterName: voter.username,
                targetId,
                targetName: target.username,
                day: this.gameState.day,
                voteCounts: this.getVoteCountsWithNames(),
                timestamp: new Date().toISOString(),
            });

            logger.info('Vote cast successfully', {
                gameId: this.gameState.gameId,
                voterId,
                voterName: voter.username,
                targetId,
                targetName: target.username,
                day: this.gameState.day,
            });
        }

        return success;
    }

    /**
     * Remove a player's vote
     */
    async removeVote(voterId: string): Promise<boolean> {
        const voter = this.gameState.getPlayer(voterId);

        if (!voter || !voter.isAlive) {
            logger.warn('Unvote attempt by dead or non-existent player', {
                gameId: this.gameState.gameId,
                voterId,
            });
            return false;
        }

        if (this.gameState.phase !== 'VOTING') {
            logger.warn('Unvote attempt during wrong phase', {
                gameId: this.gameState.gameId,
                voterId,
                currentPhase: this.gameState.phase,
            });
            return false;
        }

        const previousTarget = this.gameState.votes[voterId];
        const success = this.gameState.removeVote(voterId);

        if (success) {
            const targetPlayer = previousTarget ? this.gameState.getPlayer(previousTarget) : null;

            // ✅ A7.6 - Evento unvote
            this.gameState.addEvent('VOTE_REMOVED', {
                voterId,
                voterName: voter.username,
                previousTargetId: previousTarget,
                previousTargetName: targetPlayer?.username,
                day: this.gameState.day,
                voteCounts: this.getVoteCountsWithNames(),
                timestamp: new Date().toISOString(),
            });

            logger.info('Vote removed successfully', {
                gameId: this.gameState.gameId,
                voterId,
                voterName: voter.username,
                previousTargetId: previousTarget,
                day: this.gameState.day,
            });
        }

        return success;
    }

    //====================================================================
    // ✅ A7.3 - CALCULAR RESULTADO DA VOTAÇÃO (empates, maioria)
    //====================================================================

    /**
     * Calculate voting results with tie detection and majority calculation
     */
    calculateVotingResults(): VotingResults {
        const alivePlayers = this.gameState.getAlivePlayers();
        const voteCounts = this.gameState.getVoteCounts();
        const totalVotes = Object.values(this.gameState.votes).length;
        const totalAlive = alivePlayers.length;

        // Calculate required votes for majority (more than half)
        const requiredForMajority = Math.floor(totalAlive / 2) + 1;

        // Convert vote counts to array and sort by votes
        const voteEntries: VoteCountEntry[] = [];

        alivePlayers.forEach(player => {
            const votes = voteCounts.get(player.id) || 0;
            const voters: string[] = [];

            // Find who voted for this player
            Object.entries(this.gameState.votes).forEach(([voterId, targetId]) => {
                if (targetId === player.id) {
                    const voterPlayer = this.gameState.getPlayer(voterId);
                    if (voterPlayer) {
                        voters.push(voterPlayer.username);
                    }
                }
            });

            voteEntries.push({
                playerId: player.id,
                playerName: player.username,
                votes,
                voters,
            });
        });

        // Sort by vote count (highest first)
        voteEntries.sort((a, b) => b.votes - a.votes);

        const topEntry = voteEntries.length > 0 ? voteEntries[0] : undefined;
        const maxVotes = topEntry?.votes || 0;

        // Check for ties - count how many players have the max votes
        const playersWithMaxVotes = voteEntries.filter(entry => entry.votes === maxVotes && entry.votes > 0);
        const isTie = playersWithMaxVotes.length > 1 || maxVotes === 0;

        // Determine execution result
        let executed: VotingResults['executed'] = null;
        let reason: string | undefined;

        if (maxVotes === 0) {
            reason = 'Nenhum voto foi registrado';
        } else if (isTie) {
            reason = `Empate com ${playersWithMaxVotes.length} jogadores tendo ${maxVotes} voto(s) cada`;
        } else if (maxVotes < requiredForMajority) {
            reason = `Votos insuficientes (${maxVotes}/${requiredForMajority} necessários para maioria)`;
        } else if (topEntry) {
            // Execute the player with most votes
            const executedPlayer = this.gameState.getPlayer(topEntry.playerId);
            if (executedPlayer) {
                executed = {
                    playerId: topEntry.playerId,
                    playerName: topEntry.playerName,
                    role: executedPlayer.role,
                    votes: maxVotes,
                };
            }
        }

        const result: VotingResults = {
            executed,
            voteCounts: Object.fromEntries(voteCounts),
            totalVotes,
            requiredForMajority,
            isTie,
            ...(reason && { reason }),
        };

        logger.info('Voting results calculated', {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
            executed: executed?.playerId || 'none',
            totalVotes,
            maxVotes,
            isTie,
            reason: result.reason,
        });

        return result;
    }

    //====================================================================
    // UTILITY METHODS
    //====================================================================

    /**
     * Get vote counts with player names for display
     */
    getVoteCountsWithNames(): Array<{
        playerId: string;
        playerName: string;
        votes: number;
        voters: string[];
    }> {
        const alivePlayers = this.gameState.getAlivePlayers();
        const voteCounts = this.gameState.getVoteCounts();

        return alivePlayers.map(player => {
            const votes = voteCounts.get(player.id) || 0;
            const voters: string[] = [];

            // Find who voted for this player
            Object.entries(this.gameState.votes).forEach(([voterId, targetId]) => {
                if (targetId === player.id) {
                    const voterPlayer = this.gameState.getPlayer(voterId);
                    if (voterPlayer) {
                        voters.push(voterPlayer.username);
                    }
                }
            });

            return {
                playerId: player.id,
                playerName: player.username,
                votes,
                voters,
            };
        }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
    }

    /**
     * Get voting progress summary
     */
    getVotingProgress(): {
        totalAlive: number;
        totalVoted: number;
        totalNotVoted: number;
        votingProgress: number;
        playersNotVoted: string[];
    } {
        const alivePlayers = this.gameState.getAlivePlayers();
        const votedPlayers = new Set(Object.keys(this.gameState.votes));

        const totalAlive = alivePlayers.length;
        const totalVoted = votedPlayers.size;
        const totalNotVoted = totalAlive - totalVoted;
        const votingProgress = totalAlive > 0 ? (totalVoted / totalAlive) * 100 : 0;

        const playersNotVoted = alivePlayers
            .filter(player => !votedPlayers.has(player.id))
            .map(player => player.username);

        return {
            totalAlive,
            totalVoted,
            totalNotVoted,
            votingProgress,
            playersNotVoted,
        };
    }

    /**
     * Check if voting phase should end early (everyone voted)
     */
    isVotingComplete(): boolean {
        const alivePlayers = this.gameState.getAlivePlayers();
        const votedPlayers = Object.keys(this.gameState.votes);

        return alivePlayers.length > 0 && votedPlayers.length === alivePlayers.length;
    }

    /**
     * Get detailed voting information for debugging
     */
    getVotingDebugInfo(): any {
        const alivePlayers = this.gameState.getAlivePlayers();
        const votes = this.gameState.votes;
        const voteCounts = this.gameState.getVoteCounts();

        return {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
            phase: this.gameState.phase,
            alivePlayers: alivePlayers.map(p => ({ id: p.id, username: p.username })),
            votes: Object.entries(votes).map(([voterId, targetId]) => {
                const voter = this.gameState.getPlayer(voterId);
                const target = this.gameState.getPlayer(targetId);
                return {
                    voterId,
                    voterName: voter?.username,
                    targetId,
                    targetName: target?.username,
                };
            }),
            voteCounts: Object.fromEntries(voteCounts),
            votingProgress: this.getVotingProgress(),
            isComplete: this.isVotingComplete(),
        };
    }

    /**
     * Validate voting state integrity
     */
    validateVotingState(): {
        isValid: boolean;
        issues: string[];
    } {
        const issues: string[] = [];
        const alivePlayers = this.gameState.getAlivePlayers();
        const alivePlayerIds = new Set(alivePlayers.map(p => p.id));

        // Check if all voters are alive
        Object.keys(this.gameState.votes).forEach(voterId => {
            if (!alivePlayerIds.has(voterId)) {
                issues.push(`Dead player ${voterId} has a vote recorded`);
            }
        });

        // Check if all vote targets are alive
        Object.values(this.gameState.votes).forEach(targetId => {
            if (!alivePlayerIds.has(targetId)) {
                issues.push(`Vote cast for dead player ${targetId}`);
            }
        });

        // Check for self-votes
        Object.entries(this.gameState.votes).forEach(([voterId, targetId]) => {
            if (voterId === targetId) {
                issues.push(`Self-vote detected: ${voterId}`);
            }
        });

        return {
            isValid: issues.length === 0,
            issues,
        };
    }

    //====================================================================
    // RESET AND CLEANUP
    //====================================================================

    /**
     * Reset voting state for new phase
     */
    resetVoting(): void {
        // Clear all votes through GameState
        this.gameState.players.forEach(player => {
            if (player.hasVoted) {
                this.gameState.removeVote(player.id);
            }
        });

        logger.info('Voting state reset', {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
        });
    }

    /**
     * Force end voting phase and calculate results
     */
    forceEndVoting(): VotingResults {
        const results = this.calculateVotingResults();

        this.gameState.addEvent('VOTING_FORCED_END', {
            day: this.gameState.day,
            reason: 'Voting phase force-ended by administrator',
            results,
            timestamp: new Date().toISOString(),
        });

        logger.warn('Voting phase force-ended', {
            gameId: this.gameState.gameId,
            day: this.gameState.day,
            results,
        });

        return results;
    }

    //====================================================================
    // STATISTICS
    //====================================================================

    /**
     * Get voting statistics for analysis
     */
    getVotingStats(): {
        totalVotes: number;
        uniqueTargets: number;
        mostVotedPlayer: { playerId: string; playerName: string; votes: number } | null;
        votingDistribution: Record<string, number>;
        consensusLevel: number; // How concentrated the votes are (0-100)
    } {
        const voteCounts = this.gameState.getVoteCounts();
        const totalVotes = Object.values(this.gameState.votes).length;
        const uniqueTargets = voteCounts.size;

        let mostVotedPlayer: { playerId: string; playerName: string; votes: number } | null = null;
        let maxVotes = 0;

        // ✅ CORREÇÃO: Substituir forEach por for...of para garantir a análise de fluxo de controle do TypeScript
        for (const [playerId, votes] of voteCounts.entries()) {
            if (votes > maxVotes) {
                maxVotes = votes;
                const player = this.gameState.getPlayer(playerId);
                if (player) {
                    mostVotedPlayer = {
                        playerId,
                        playerName: player.username,
                        votes,
                    };
                }
            }
        }

        // Calculate consensus level (how concentrated the votes are)
        let consensusLevel = 0;
        if (totalVotes > 0 && mostVotedPlayer) {
            consensusLevel = (mostVotedPlayer.votes / totalVotes) * 100;
        }

        return {
            totalVotes,
            uniqueTargets,
            mostVotedPlayer,
            votingDistribution: Object.fromEntries(voteCounts),
            consensusLevel,
        };
    }
}