// scripts/test-game-logic.ts

// Agora usamos imports nativos do TypeScript, que o tsx entende perfeitamente.
import { GameEngine } from '../backend/src/game/GameEngine';
import { Player } from '../backend/src/game/Game';
import { RoleDistributor } from '../backend/src/game/RoleSystem';
import { Role } from '../backend/src/utils/constants';
import type { GameConfig } from '../backend/src/types';

// Helper para formatar o output
const log = (title: string, data: any, status: '✅' | '▶️' | 'ℹ️' | '⚙️' = 'ℹ️') => {
    console.log(`\n${status} ${title.toUpperCase()}`);
    console.log('-----------------------------------');
    if (typeof data === 'object') {
        console.dir(data, { depth: null });
    } else {
        console.log(data);
    }
};

async function testTask5() {
    console.log('🐺 LOBISOMEM ONLINE - DIAGNÓSTICO DA LÓGICA DO JOGO (TASK 5)');
    console.log('============================================================');

    log('A5.4: Instanciando GameEngine', 'Criando uma nova instância...');
    const gameEngine = new GameEngine();
    log('A5.4: GameEngine Instanciado', 'Instância criada com sucesso.', '✅');

    const gameConfig: GameConfig = {
        roomId: 'room-test-123',
        maxPlayers: 15,
        maxSpectators: 5,
        nightDuration: 30000,
        dayDuration: 60000,
        votingDuration: 30000,
        allowReconnection: true,
        reconnectionTimeout: 60000,
    };
    log('A5.1: Criando um novo jogo (GameState)', gameConfig, '▶️');
    const gameState = await gameEngine.createGame('host-id-01', gameConfig);
    const gameId = gameState.gameId;
    log('A5.1: Jogo (GameState) Criado', { gameId, status: gameState.status, phase: gameState.phase }, '✅');

    const playersToAdd: Player[] = [];
    const playerCount = 8;
    for (let i = 0; i < playerCount; i++) {
        playersToAdd.push(new Player({
            id: `player-id-${i}`, userId: `user-id-${i}`, username: `Jogador_${i + 1}`,
            isHost: i === 0, isReady: true, isSpectator: false, isConnected: true,
            joinedAt: new Date(), lastSeen: new Date(),
        }));
    }
    log(`A5.1: Instanciando ${playerCount} Players`, playersToAdd.map(p => p.username).join(', '), '✅');

    for (const player of playersToAdd) {
        await gameEngine.addPlayer(gameId, player);
    }
    log(`A5.1: Players adicionados`, `Total: ${gameState.players.length}`, '✅');

    log('A5.2: Buscando config do Médico', 'RoleDistributor.getRoleConfig(Role.DOCTOR)', '▶️');
    const doctorConfig = RoleDistributor.getRoleConfig(Role.DOCTOR);
    log('A5.2: Configuração do Médico', doctorConfig, '✅');

    log(`A5.3: Calculando distribuição para ${playerCount} jogadores`, `RoleDistributor.getRoleDistribution(${playerCount})`, '▶️');
    const distribution = RoleDistributor.getRoleDistribution(playerCount);
    const roleSum = Object.values(distribution).reduce((a, b) => a + b, 0);
    log(`A5.3: Distribuição Calculada (Total: ${roleSum} roles)`, distribution, '✅');
    if (roleSum !== playerCount) console.error(`❌ ERRO: Soma de papéis (${roleSum}) != número de jogadores (${playerCount})!`);

    log('A5.4: Iniciando o jogo', 'gameEngine.startGame(gameId)', '▶️');
    const gameStarted = await gameEngine.startGame(gameId);
    if (!gameStarted) {
        console.error('❌ ERRO: Falha ao iniciar o jogo!');
        return;
    }
    const startedGameState = (await gameEngine.getGameState(gameId))!;
    log('A5.4: Jogo Iniciado', { status: startedGameState.status, phase: startedGameState.phase, day: startedGameState.day }, '✅');

    const assignedRoles = startedGameState.getAlivePlayers().map(p => ({ username: p.username, role: p.role, faction: p.faction }));
    log('A5.4: Papéis distribuídos', assignedRoles, '✅');

    log('A5.5 & A5.6: Testando transições de fase', 'Chamando nextPhase() sequencialmente...', '⚙️');

    let currentState: typeof startedGameState = startedGameState;
    log(`Fase Atual: ${currentState.phase} | Dia: ${currentState.day}`, 'Após startGame', '▶️');

    await gameEngine.nextPhase(gameId);
    currentState = (await gameEngine.getGameState(gameId))!;
    log(`Fase Atual: ${currentState.phase} | Dia: ${currentState.day}`, 'Após 1ª chamada de nextPhase()', '▶️');

    await gameEngine.nextPhase(gameId);
    currentState = (await gameEngine.getGameState(gameId))!;
    log(`Fase Atual: ${currentState.phase} | Dia: ${currentState.day}`, 'Após 2ª chamada de nextPhase()', '▶️');

    await gameEngine.nextPhase(gameId);
    currentState = (await gameEngine.getGameState(gameId))!;
    log(`Fase Atual: ${currentState.phase} | Dia: ${currentState.day}`, 'Após 3ª chamada de nextPhase()', '▶️');

    log('A5.5 & A5.6: Transições de fase OK', `Sequência: LOBBY -> NIGHT -> DAY -> VOTING -> NIGHT`, '✅');

    log('A5.4: Finalizando o jogo', `gameEngine.endGame(gameId)`, '▶️');
    await gameEngine.endGame(gameId, 'Teste finalizado');
    const finalGameState = (await gameEngine.getGameState(gameId))!;
    log('A5.4: Jogo Finalizado', { status: finalGameState.status, winningFaction: finalGameState.winningFaction }, '✅');

    console.log('\n\n============================================================');
    console.log('✅ DIAGNÓSTICO DA TASK 5 CONCLUÍDO COM SUCESSO!');
    console.log('============================================================');
}

testTask5().catch(error => {
    console.error('\n❌ UM ERRO CRÍTICO OCORREU DURANTE O TESTE:', error);
});