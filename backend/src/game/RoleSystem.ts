// 🐺 LOBISOMEM ONLINE - Role System and Distribution (CORRIGIDO DEFINITIVAMENTE + DEBUG MODE)
// ✅ PREPARADO PARA MIGRAÇÃO AUTOMÁTICA → game-service

import { Role, Faction } from '@/utils/constants';

//====================================================================
// ROLE CONFIGURATION INTERFACE
//====================================================================
export interface RoleConfiguration {
  role: Role;
  faction: Faction;
  name: string;
  description: string;
  abilities: string[];
  goalDescription: string;
  canAct: boolean;
  actsDuring: string[];
  hasNightChat: boolean;
  immuneToInvestigation: boolean;
  maxActions?: number;
  priority: number; // Action priority (lower = executes first)
}

//====================================================================
// ROLE DEFINITIONS (Based on Town of Salem)
//====================================================================
const roleConfigurations: Record<Role, RoleConfiguration> = {
  // TOWN ROLES
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    faction: Faction.TOWN,
    name: 'Aldeão',
    description: 'Cidadão comum da vila sem poderes especiais',
    abilities: ['Votar durante o dia'],
    goalDescription: 'Eliminar todos os Lobisomens e inimigos da vila',
    canAct: false,
    actsDuring: [],
    hasNightChat: false,
    immuneToInvestigation: false,
    priority: 999, // No actions
  },

  [Role.SHERIFF]: {
    role: Role.SHERIFF,
    faction: Faction.TOWN,
    name: 'Investigador',
    description: 'Investiga pessoas durante a noite para descobrir se são suspeitas',
    abilities: [
      'Investigar uma pessoa por noite',
      'Descobre se o alvo é "SUSPEITO" ou "NÃO SUSPEITO"',
      'Lobisomens e Serial Killers aparecem como SUSPEITO',
      'Vila e Neutros pacíficos aparecem como NÃO SUSPEITO'
    ],
    goalDescription: 'Encontrar e eliminar todos os Lobisomens usando suas investigações',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
    priority: 3, // After protections but before kills
  },

  [Role.DOCTOR]: {
    role: Role.DOCTOR,
    faction: Faction.TOWN,
    name: 'Médico',
    description: 'Protege pessoas da morte durante a noite',
    abilities: [
      'Proteger uma pessoa por noite de ataques',
      'Não pode proteger a mesma pessoa duas noites seguidas',
      'Não pode se proteger duas noites seguidas',
      'Proteção impede morte por qualquer fonte noturna'
    ],
    goalDescription: 'Manter a vila viva e eliminar os Lobisomens',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
    priority: 1, // First to act - protections applied before attacks
  },

  [Role.VIGILANTE]: {
    role: Role.VIGILANTE,
    faction: Faction.TOWN,
    name: 'Vigilante',
    description: 'Pode matar suspeitos durante a noite, mas tem consequências',
    abilities: [
      'Matar uma pessoa por noite (máximo 3 vezes)',
      'Se matar um inocente (Vila), fica de luto e perde a próxima ação',
      'Pode matar Lobisomens, Serial Killers e Neutros malignos',
      'Suas balas são limitadas - use com sabedoria'
    ],
    goalDescription: 'Eliminar os inimigos da vila usando força letal',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
    maxActions: 3,
    priority: 4, // After investigations
  },

  // WEREWOLF ROLES
  [Role.WEREWOLF]: {
    role: Role.WEREWOLF,
    faction: Faction.WEREWOLF,
    name: 'Lobisomem',
    description: 'Elimina aldeões durante a noite em coordenação com a alcateia',
    abilities: [
      'Votar em quem matar durante a noite com outros Lobisomens',
      'Chat secreto com outros Lobisomens durante a noite',
      'Pode blefar como qualquer role durante o dia',
      'Aparece como SUSPEITO para o Investigador'
    ],
    goalDescription: 'Igualar ou superar o número de aldeões vivos',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: true,
    immuneToInvestigation: false,
    priority: 5, // Werewolf kills
  },

  [Role.WEREWOLF_KING]: {
    role: Role.WEREWOLF_KING,
    faction: Faction.WEREWOLF,
    name: 'Rei dos Lobisomens',
    description: 'Líder da alcateia com imunidade especial à investigação',
    abilities: [
      'Liderar votação de morte noturna da alcateia',
      'IMUNE à investigação do Sheriff (aparece como NÃO SUSPEITO)',
      'Chat secreto com outros Lobisomens durante a noite',
      'Pode coordenar estratégias e bleffs da alcateia'
    ],
    goalDescription: 'Comandar a alcateia para dominar a vila',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: true,
    immuneToInvestigation: true, // SPECIAL: Immune to Sheriff
    priority: 5, // Werewolf kills (same as regular werewolf)
  },

  // NEUTRAL ROLES
  [Role.JESTER]: {
    role: Role.JESTER,
    faction: Faction.NEUTRAL,
    name: 'Bobo da Corte',
    description: 'Vence sendo executado por votação durante o dia',
    abilities: [
      'Objetivo único: ser executado por votação popular',
      'Não pode ser morto à noite (proteção básica)',
      'Deve agir de forma suspeita sem ser óbvio demais',
      'Se executado, VENCE SOZINHO independente de outros'
    ],
    goalDescription: 'Ser executado por votação popular durante o dia',
    canAct: false,
    actsDuring: [],
    hasNightChat: false,
    immuneToInvestigation: false,
    priority: 999, // No night actions
  },

  [Role.SERIAL_KILLER]: {
    role: Role.SERIAL_KILLER,
    faction: Faction.NEUTRAL,
    name: 'Assassino em Série',
    description: 'Mata uma pessoa por noite, vence sendo o último sobrevivente',
    abilities: [
      'Matar uma pessoa por noite',
      'Imune a proteção do Doctor na primeira noite',
      'Aparece como SUSPEITO para o Investigador',
      'Deve eliminar TODOS os outros jogadores para vencer'
    ],
    goalDescription: 'Ser o último sobrevivente - eliminar todos os outros',
    canAct: true,
    actsDuring: ['NIGHT'],
    hasNightChat: false,
    immuneToInvestigation: false,
    priority: 6, // After werewolf kills
  },
};

//====================================================================
// ROLE DISTRIBUTION SYSTEM
//====================================================================
export type RoleDistribution = Record<Role, number>;

const balancedRoleDistributions: Record<number, RoleDistribution> = {
  // 3 players - DEBUG MODE (Modo de teste rápido)
  3: {
    [Role.VILLAGER]: 0,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 0,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 0,
    [Role.JESTER]: 0,
    [Role.SERIAL_KILLER]: 0,
  },

  4: {
    [Role.VILLAGER]: 0,
    [Role.SHERIFF]: 0,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 0,
    [Role.JESTER]: 0,
    [Role.SERIAL_KILLER]: 1,
  },

  // 6 players - Minimum composition
  6: {
    [Role.VILLAGER]: 1,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 0,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 0,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 0,
  },

  // 7 players
  7: {
    [Role.VILLAGER]: 2,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 0,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 0,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 0,
  },

  // 8 players
  8: {
    [Role.VILLAGER]: 2,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 0,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 0,
  },

  // 9 players - Balanced composition
  9: {
    [Role.VILLAGER]: 2,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 10 players
  10: {
    [Role.VILLAGER]: 3,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 11 players
  11: {
    [Role.VILLAGER]: 4,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 1,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 12 players - Standard composition
  12: {
    [Role.VILLAGER]: 4,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 13 players
  13: {
    [Role.VILLAGER]: 5,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 14 players
  14: {
    [Role.VILLAGER]: 6,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 2,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },

  // 15 players - Maximum composition
  15: {
    [Role.VILLAGER]: 6,
    [Role.SHERIFF]: 1,
    [Role.DOCTOR]: 1,
    [Role.VIGILANTE]: 1,
    [Role.WEREWOLF]: 3,
    [Role.WEREWOLF_KING]: 1,
    [Role.JESTER]: 1,
    [Role.SERIAL_KILLER]: 1,
  },
};

//====================================================================
// ROLE DISTRIBUTION LOGIC - SEM EXPORT NA DECLARAÇÃO
//====================================================================
class RoleDistributor {
  /**
* Get balanced role distribution for a given number of players
*/
  static getRoleDistribution(playerCount: number): RoleDistribution {
    // Use exact match if available
    if (balancedRoleDistributions[playerCount]) {
      // Adicionando '!' aqui também por consistência e segurança máxima.
      return { ...balancedRoleDistributions[playerCount]! };
    }

    // 1. Prepara a lista de contagens de jogadores disponíveis.
    const sortedCounts = Object.keys(balancedRoleDistributions)
      .map(Number)
      .sort((a, b) => a - b);

    // 2. "Guard Clause" para provar ao TS que o array não está vazio.
    if (sortedCounts.length === 0) {
      throw new Error("FATAL: No balanced role distributions are defined.");
    }

    // 3. Encontra o valor mais próximo.
    let closest: number | undefined;
    for (const count of sortedCounts) {
      if (count >= playerCount) {
        closest = count;
        break;
      }
    }

    // 4. Garante que 'lastCount' e 'chosenCount' são números.
    const lastCount = sortedCounts[sortedCounts.length - 1]!;
    const chosenCount = closest ?? lastCount;

    // 5. A SOLUÇÃO PARA O NOVO ERRO:
    // Afirmamos que o resultado do acesso ao objeto não será undefined.
    const baseDistribution = { ...balancedRoleDistributions[chosenCount]! };

    // Agora, 'baseDistribution' é garantidamente do tipo 'RoleDistribution',
    // resolvendo os erros nas linhas seguintes.
    if (chosenCount > playerCount) {
      return this.adjustRoleDistribution(baseDistribution, playerCount);
    }

    return baseDistribution;
  }

  /**
   * Adjust role distribution to match exact player count
   */
  private static adjustRoleDistribution(distribution: RoleDistribution, targetCount: number): RoleDistribution {
    const newDistribution = { ...distribution };
    const currentTotal = Object.values(newDistribution).reduce((sum, count) => sum + count, 0);
    const difference = currentTotal - targetCount;

    if (difference > 0) {
      // Remove roles starting with villagers, then neutrals
      const removeOrder: Role[] = [Role.VILLAGER, Role.SERIAL_KILLER, Role.JESTER, Role.WEREWOLF, Role.VIGILANTE];

      let toRemove = difference;
      for (const role of removeOrder) {
        if (toRemove <= 0) break;
        const canRemove = Math.min(newDistribution[role], toRemove);
        newDistribution[role] -= canRemove;
        toRemove -= canRemove;
      }
    }

    return newDistribution;
  }

  /**
* Distribute roles to players randomly while maintaining balance
*/
  static distributeRolesToPlayers(playerIds: string[], distribution: RoleDistribution): Map<string, Role> {
    const roles: Role[] = [];

    // Create array of roles based on distribution
    Object.entries(distribution).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        roles.push(role as Role);
      }
    });

    // Shuffle arrays
    const shuffledPlayers = this.shuffleArray([...playerIds]);
    const shuffledRoles = this.shuffleArray([...roles]);

    // Create assignment map
    const roleAssignment = new Map<string, Role>();
    shuffledPlayers.forEach((playerId, index) => {
      // CORREÇÃO: Verificar se o índice existe no array antes de acessar
      if (index < shuffledRoles.length) {
        const role = shuffledRoles[index];
        if (role) { // Verificação adicional para garantir que role não é undefined
          roleAssignment.set(playerId, role);
        }
      }
    });

    return roleAssignment;
  }

  /**
   * Validate if a role distribution is balanced
   */
  static validateDistribution(distribution: RoleDistribution): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const totalPlayers = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const townCount = distribution[Role.VILLAGER] + distribution[Role.SHERIFF] + distribution[Role.DOCTOR] + distribution[Role.VIGILANTE];
    const werewolfCount = distribution[Role.WEREWOLF] + distribution[Role.WEREWOLF_KING];
    const neutralCount = distribution[Role.JESTER] + distribution[Role.SERIAL_KILLER];

    // Basic validation
    if (totalPlayers < 3) {
      issues.push('Mínimo de 3 jogadores necessário (modo debug)');
    }

    if (totalPlayers > 15) {
      issues.push('Máximo de 15 jogadores permitido');
    }

    // Balance validation
    const werewolfRatio = werewolfCount / totalPlayers;
    if (werewolfRatio < 0.2) {
      issues.push('Muito poucos Lobisomens - jogo pode ser desequilibrado para a Vila');
    }

    if (werewolfRatio > 0.4) {
      issues.push('Muitos Lobisomens - jogo pode ser desequilibrado para os Lobisomens');
    }

    // Essential roles validation
    if (distribution[Role.SHERIFF] === 0 && totalPlayers >= 7) {
      recommendations.push('Adicionar pelo menos 1 Investigador para jogos com 7+ jogadores');
    }

    if (distribution[Role.DOCTOR] === 0 && totalPlayers >= 8) {
      recommendations.push('Adicionar pelo menos 1 Médico para jogos com 8+ jogadores');
    }

    // Power roles balance
    const powerRoles = distribution[Role.SHERIFF] + distribution[Role.DOCTOR] + distribution[Role.VIGILANTE];
    if (powerRoles > werewolfCount + 1) {
      recommendations.push('Muitas roles de poder da Vila podem desequilibrar o jogo');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get role configuration for a specific role
   */
  static getRoleConfig(role: Role): RoleConfiguration {
    return roleConfigurations[role];
  }

  /**
   * Get all roles that can act during a specific phase
   */
  static getRolesThatActDuring(phase: string): Role[] {
    return Object.values(roleConfigurations)
      .filter(config => config.actsDuring.includes(phase))
      .map(config => config.role);
  }

  /**
   * Get roles ordered by action priority
   */
  static getRolesByPriority(): Role[] {
    return Object.values(roleConfigurations)
      .sort((a, b) => a.priority - b.priority)
      .map(config => config.role);
  }

  /**
   * Check if a role is part of a specific faction
   */
  static isRoleInFaction(role: Role, faction: Faction): boolean {
    return roleConfigurations[role].faction === faction;
  }

  /**
   * Get all roles from a specific faction
   */
  static getRolesFromFaction(faction: Faction): Role[] {
    return Object.values(roleConfigurations)
      .filter(config => config.faction === faction)
      .map(config => config.role);
  }

  /**
   * Fisher-Yates shuffle algorithm - CORREÇÃO para exactOptionalPropertyTypes
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // CORREÇÃO: Garantir que os elementos existem antes do swap
      const temp = shuffled[i];
      const swapTarget = shuffled[j];
      if (temp !== undefined && swapTarget !== undefined) {
        shuffled[i] = swapTarget;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }
}

//====================================================================
// ROLE REVEAL UTILITIES - SEM EXPORT NA DECLARAÇÃO
//====================================================================
class RoleRevealManager {
  /**
   * Get information that should be revealed when a player dies
   */
  static getDeathReveal(role: Role): {
    role: Role;
    faction: Faction;
    name: string;
    description: string;
  } {
    const config = roleConfigurations[role];
    return {
      role: config.role,
      faction: config.faction,
      name: config.name,
      description: config.description,
    };
  }

  /**
   * Get investigation result for Sheriff
   */
  static getInvestigationResult(targetRole: Role): 'SUSPICIOUS' | 'NOT_SUSPICIOUS' {
    const config = roleConfigurations[targetRole];

    // Werewolf King is immune to investigation
    if (config.immuneToInvestigation) {
      return 'NOT_SUSPICIOUS';
    }

    // Werewolves and Serial Killer are suspicious
    if (config.faction === Faction.WEREWOLF || targetRole === Role.SERIAL_KILLER) {
      return 'SUSPICIOUS';
    }

    // Town and peaceful neutrals are not suspicious
    return 'NOT_SUSPICIOUS';
  }

  /**
   * Check if a role has night chat access
   */
  static hasNightChat(role: Role): boolean {
    return roleConfigurations[role].hasNightChat;
  }

  /**
   * Get roles that share night chat (Werewolves)
   */
  static getNightChatRoles(): Role[] {
    return Object.values(roleConfigurations)
      .filter(config => config.hasNightChat)
      .map(config => config.role);
  }
}

//====================================================================
// WIN CONDITION CALCULATOR - SEM EXPORT NA DECLARAÇÃO
//====================================================================
class WinConditionCalculator {
  /**
   * Calculate win condition based on alive players and their roles
   */
  static calculateWinCondition(alivePlayers: { playerId: string; role: Role }[]): {
    hasWinner: boolean;
    winningFaction?: Faction;
    winningPlayers?: string[];
    reason?: string;
  } {
    if (alivePlayers.length === 0) {
      return { hasWinner: false };
    }

    // Group players by faction
    const factionGroups = new Map<Faction, { playerId: string; role: Role }[]>();

    alivePlayers.forEach(player => {
      const faction = roleConfigurations[player.role].faction;
      const players = factionGroups.get(faction) || [];
      players.push(player);
      factionGroups.set(faction, players);
    });

    const townPlayers = factionGroups.get(Faction.TOWN) || [];
    const werewolfPlayers = factionGroups.get(Faction.WEREWOLF) || [];
    const neutralPlayers = factionGroups.get(Faction.NEUTRAL) || [];

    // Check for Jester win (this would be handled separately when someone is executed)
    const jester = neutralPlayers.find(p => p.role === Role.JESTER);
    // Jester win is handled in execution logic, not here

    // Werewolves win if they equal or outnumber town
    if (werewolfPlayers.length >= townPlayers.length && townPlayers.length > 0) {
      return {
        hasWinner: true,
        winningFaction: Faction.WEREWOLF,
        winningPlayers: werewolfPlayers.map(p => p.playerId),
        reason: 'Lobisomens igualam ou superam o número da Vila',
      };
    }

    // Town wins if no werewolves left
    if (werewolfPlayers.length === 0 && townPlayers.length > 0) {
      return {
        hasWinner: true,
        winningFaction: Faction.TOWN,
        winningPlayers: townPlayers.map(p => p.playerId),
        reason: 'Todos os Lobisomens foram eliminados',
      };
    }

    // Serial Killer wins if alone
    const serialKiller = neutralPlayers.find(p => p.role === Role.SERIAL_KILLER);
    if (townPlayers.length + werewolfPlayers.length === 0 && serialKiller) {
      return {
        hasWinner: true,
        winningFaction: Faction.NEUTRAL,
        winningPlayers: [serialKiller.playerId],
        reason: 'Assassino em Série eliminou todos os outros',
      };
    }

    return { hasWinner: false };
  }

  /**
   * Check if Jester wins by being executed
   */
  static checkJesterWin(executedRole: Role): boolean {
    return executedRole === Role.JESTER;
  }
}

//====================================================================
// EXPORTS (CORRIGIDOS - APENAS UMA VEZ)
//====================================================================
export {
  roleConfigurations as ROLE_CONFIGURATIONS,
  balancedRoleDistributions as BALANCED_ROLE_DISTRIBUTIONS,
  RoleDistributor,
  RoleRevealManager,
  WinConditionCalculator,
};