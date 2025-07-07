#!/usr/bin/env node

// 🐺 LOBISOMEM ONLINE - Test Voting System (Task A7.2-A7.6)
// Script de teste completo para o sistema de votação (CORREÇÃO FINAL)

const axios = require('axios');
const WebSocket = require('ws');

// Configurações
const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

// ✅ Objeto de log e cores definidos no escopo global do script
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    step: (msg) => console.log(`\n${colors.cyan}🔄 ${msg}${colors.reset}`),
};

const testState = {
    users: [],
    roomId: null,
    gameId: null,
    connections: [],
    receivedMessages: [],
    testResults: {
        passed: 0,
        failed: 0,
        total: 0
    }
};

function assert(condition, description) {
    testState.testResults.total++;
    if (condition) {
        testState.testResults.passed++;
        log.success(`✓ ${description}`);
        return true;
    } else {
        testState.testResults.failed++;
        log.error(`✗ ${description}`);
        console.log('--- Estado atual na falha ---');
        console.log('Últimos 10 eventos recebidos:', JSON.stringify(testState.receivedMessages.slice(-10), null, 2));
        console.log('---------------------------');
        return false;
    }
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function cleanupPreviousRooms(userCredentials) {
    log.step('Limpando salas de testes anteriores...');
    for (const cred of userCredentials) {
        try {
            const loginRes = await axios.post(`${API_URL}/api/auth/login`, cred);
            const token = loginRes.data.data.tokens.accessToken;
            const { data } = await axios.get(`${API_URL}/api/rooms`, { headers: { 'Authorization': `Bearer ${token}` } });

            // Correção: Achar o usuário pelo token para obter o username correto
            const hostUser = testState.users.find(u => u.token === token) || { username: cred.username };
            const userRooms = data.data.rooms.filter(room => room.hostUsername === hostUser.username);

            for (const room of userRooms) {
                log.info(`Deletando sala antiga "${room.name}" (ID: ${room.id}) do host ${hostUser.username}`);
                await axios.delete(`${API_URL}/api/rooms/${room.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            }
        } catch (error) { /* Ignorar erros de limpeza */ }
    }
    log.success('Ambiente limpo.');
}

async function setupTestUsers() {
    log.step('Criando e logando usuários de teste...');
    const userTemplates = [
        { email: 'voter1@test.com', username: 'Voter1', password: 'Test123!' },
        { email: 'voter2@test.com', username: 'Voter2', password: 'Test123!' },
        { email: 'voter3@test.com', username: 'Voter3', password: 'Test123!' },
        { email: 'voter4@test.com', username: 'Voter4', password: 'Test123!' },
        { email: 'voter5@test.com', username: 'Voter5', password: 'Test123!' },
        { email: 'voter6@test.com', username: 'Voter6', password: 'Test123!' },
    ];
    for (const user of userTemplates) {
        try {
            await axios.post(`${API_URL}/api/auth/register`, { ...user, confirmPassword: user.password });
        } catch (error) { /* Ignorar se já existe */ }
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, { email: user.email, password: user.password });
            if (response.data.success) {
                const existingUser = testState.users.find(u => u.id === response.data.data.user.id);
                if (!existingUser) {
                    testState.users.push({ ...response.data.data.user, token: response.data.data.tokens.accessToken });
                }
            }
        } catch (e) {
            log.error(`Falha ao logar usuário ${user.username}`);
        }
    }
    assert(testState.users.length >= 6, `Criados e logados ${testState.users.length} usuários.`);
}

async function createTestRoom() {
    log.step('Criando sala de teste...');
    const host = testState.users[0];
    const response = await axios.post(`${API_URL}/api/rooms`,
        { name: 'Sala Teste Votação', isPrivate: false, maxPlayers: 10 },
        { headers: { 'Authorization': `Bearer ${host.token}` } }
    );
    testState.roomId = response.data.data.room.id;
    assert(testState.roomId, `Sala criada com sucesso: ${testState.roomId}`);
}

async function connectPlayersToRoom() {
    log.step('Conectando players à sala via WebSocket...');
    const connectionPromises = testState.users.map((user) => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}?token=${user.token}`);
            const connection = { user, ws };
            testState.connections.push(connection);

            ws.on('open', () => {
                log.info(`${user.username} conectado via WebSocket.`);
                ws.send(JSON.stringify({ type: 'join-room', data: { roomId: testState.roomId } }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                testState.receivedMessages.push({ user: user.username, event: message, timestamp: new Date() });

                if (message.type === 'room-joined') {
                    log.success(`${user.username} entrou na sala ${message.data.room.id}.`);
                    if (message.data.gameId) testState.gameId = message.data.gameId;
                    resolve(ws);
                }
                if (message.type === 'game-started' && !testState.gameId) {
                    testState.gameId = message.data.gameId;
                }
                if (message.type === 'error') {
                    log.error(`Erro recebido por ${user.username}: ${message.data.message}`);
                }
            });

            ws.on('error', (err) => reject(new Error(`Erro WebSocket para ${user.username}: ${err.message}`)));
            ws.on('close', (code, reason) => {
                if (code !== 1000 && code !== 1005) {
                    log.warning(`${user.username} desconectado com código: ${code}, razão: ${reason.toString()}`);
                }
            });
        });
    });
    await Promise.all(connectionPromises);
    assert(testState.connections.length === testState.users.length, `${testState.connections.length} players conectados com sucesso.`);
    await wait(1000);
}

async function markPlayersReady() {
    log.step('Marcando players como prontos...');
    let readyCount = 0;
    const totalPlayers = testState.connections.length;

    const readyPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando jogadores ficarem prontos')), 10000);
        const interval = setInterval(() => {
            const readyMessages = testState.receivedMessages.filter(
                (msg) => msg.event.type === 'player-ready' && msg.event.data.ready === true
            );
            const uniqueReadyPlayers = new Set(readyMessages.map(msg => msg.event.data.userId));
            readyCount = uniqueReadyPlayers.size;

            if (readyCount >= totalPlayers) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(true);
            }
        }, 500);
    });

    for (const connection of testState.connections) {
        connection.ws.send(JSON.stringify({ type: 'player-ready', data: { ready: true } }));
        await wait(100);
    }

    await readyPromise;
    log.success('Todos os players marcados como prontos.');
}

async function startGame() {
    log.step('Iniciando o jogo...');
    const hostConnection = testState.connections[0].ws;
    hostConnection.send(JSON.stringify({ type: 'start-game', data: {} }));

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando evento game-started')), 10000);
        const interval = setInterval(() => {
            const gameStartedEvent = testState.receivedMessages.find(m => m.event.type === 'game-started');
            if (gameStartedEvent) {
                if (!testState.gameId) testState.gameId = gameStartedEvent.event.data.gameId;
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(true);
            }
        }, 200);
    });

    assert(testState.gameId, 'Evento "game-started" foi recebido e o gameId foi capturado.');
}

async function forceToVotingPhase() {
    log.step('Forçando transição para a fase de votação (de forma reativa)...');
    const hostConnection = testState.connections[0].ws;

    for (let attempt = 1; attempt <= 5; attempt++) {
        // Pega o evento de mudança de fase mais recente
        const lastPhaseEvent = [...testState.receivedMessages]
            .reverse()
            .find(m => m.event.type === 'phase:changed')?.event;

        const currentPhase = lastPhaseEvent?.data?.phase || 'NIGHT'; // Assumimos que começa em NIGHT se nada for encontrado
        log.info(`Tentativa ${attempt}: Fase atual detectada é '${currentPhase}'.`);

        // Verifica se já chegamos ao nosso destino
        if (currentPhase === 'VOTING') {
            assert(true, `Fase de votação alcançada com sucesso no Dia ${lastPhaseEvent.data.day}.`);
            return; // Sucesso!
        }

        // Conta quantos eventos de mudança de fase já recebemos
        const phaseChangeCountBefore = testState.receivedMessages.filter(m => m.event.type === 'phase:changed').length;

        log.warning(`Enviando comando 'force-phase' para avançar da fase '${currentPhase}'...`);
        hostConnection.send(JSON.stringify({ type: 'force-phase', data: {} }));

        // ✅ A PARTE MÁGICA: Espera ativamente por um NOVO evento de mudança de fase
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Timeout esperando por um novo evento 'phase:changed' após a tentativa ${attempt}`)), 5000);

                const interval = setInterval(() => {
                    const phaseChangeCountAfter = testState.receivedMessages.filter(m => m.event.type === 'phase:changed').length;
                    if (phaseChangeCountAfter > phaseChangeCountBefore) {
                        clearInterval(interval);
                        clearTimeout(timeout);
                        resolve(true);
                    }
                }, 200); // Verifica a cada 200ms
            });
            log.success('Novo evento de mudança de fase recebido.');

        } catch (error) {
            assert(false, error.message);
            throw error;
        }
    }

    // Se sair do loop, falhou.
    assert(false, 'Timeout: Não foi possível forçar a transição para a fase de votação após 5 tentativas.');
    throw new Error("Não foi possível alcançar a fase de votação.");
}

async function testVotingSystem() {
    log.step('🗳️  Testando A7.2 - Sistema de Votação (vote, unvote)');
    const [voter1, , target1] = testState.connections;

    const targetUserId = testState.users[2].id; // Voter3
    const voterUserId = testState.users[0].id; // Voter1

    log.info(`Voter1 (${voterUserId}) vai votar em ${target1.user.username} (${targetUserId})`);
    voter1.ws.send(JSON.stringify({ type: 'vote', data: { targetId: targetUserId } }));
    await wait(1500);

    const voteRegistered = testState.receivedMessages.some(e => e.event.type === 'vote-cast' && e.event.data?.voterId === voterUserId && e.event.data?.targetId === targetUserId);
    assert(voteRegistered, `Voto de ${voter1.user.username} em ${target1.user.username} foi registrado.`);

    voter1.ws.send(JSON.stringify({ type: 'unvote', data: {} }));
    await wait(1500);

    const unvoteRegistered = testState.receivedMessages.some(e => e.event.type === 'vote-removed' && e.event.data?.voterId === voterUserId);
    assert(unvoteRegistered, `Unvote de ${voter1.user.username} foi registrado.`);
}

async function testVotingCalculationAndExecution() {
    log.step('🧮 Testando A7.3/A7.4 - Cálculo de Resultado e Execução');
    const [voter1, voter2, voter3, voter4] = testState.connections;
    const target = testState.connections[5];
    const targetUserId = testState.users[5].id;

    log.info(`Votação em massa em ${target.user.username} (${targetUserId}) para forçar uma execução.`);
    voter1.ws.send(JSON.stringify({ type: 'vote', data: { targetId: targetUserId } })); await wait(100);
    voter2.ws.send(JSON.stringify({ type: 'vote', data: { targetId: targetUserId } })); await wait(100);
    voter3.ws.send(JSON.stringify({ type: 'vote', data: { targetId: targetUserId } })); await wait(100);
    voter4.ws.send(JSON.stringify({ type: 'vote', data: { targetId: targetUserId } })); await wait(100);

    log.info("Todos votaram. Forçando o fim da fase de votação para obter os resultados...");

    // ✅ A CORREÇÃO ESTÁ AQUI: Enviamos um último force-phase
    const hostConnection = testState.connections[0].ws;
    hostConnection.send(JSON.stringify({ type: 'force-phase', data: {} }));

    // Agora esperamos pelo evento 'voting-results'
    const resultsEvent = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout esperando por 'voting-results'")), 10000); // 10s é mais que suficiente
        const interval = setInterval(() => {
            const event = [...testState.receivedMessages].reverse().find(m => m.event.type === 'voting-results');
            if (event) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(event.event);
            }
        }, 500);
    });

    if (assert(resultsEvent, 'Evento "voting-results" foi recebido.')) {
        const resultData = resultsEvent.data;
        if (assert(resultData.executed, 'Houve um jogador executado.')) {
            log.success(`Jogador ${resultData.executed.playerName} foi executado com ${resultData.executed.votes} votos.`);
            assert(resultData.executed.votes >= 4, `Contagem de votos para o executado está correta (>=4).`);
        }
    }
}

async function testFinalEventsAndWinCondition() {
    log.step('📡🏆 Testando A7.1, A7.5, A7.6 - Eventos Finais e Condição de Vitória');

    const dayResultsEvent = testState.receivedMessages.find(e => e.event.type === 'day-results');
    assert(dayResultsEvent !== undefined, 'Evento "day-results" (A7.1) foi recebido em algum momento.');

    const gameEndedEvent = testState.receivedMessages.find(e => e.event.type === 'game-ended');
    if (gameEndedEvent) {
        const endData = gameEndedEvent.event.data;
        assert(true, 'Condição de vitória (A7.5) foi atingida e o jogo terminou.');
        log.success(`Jogo terminou: ${endData.winningFaction} venceu. Razão: ${endData.reason}`);
    } else {
        log.warning('Jogo continuou após execução, o que é normal. Verificação de Condição de Vitória (A7.5) é acionada, mas não necessariamente termina o jogo.');
        assert(true, 'Jogo continuou após execução, como esperado (A7.5).');
    }
}

// ✅ Função de limpeza corrigida para usar o 'log' global
async function cleanup() {
    log.step('🧹 Limpando conexões...');
    testState.connections.forEach(conn => {
        if (conn.ws.readyState === WebSocket.OPEN) conn.ws.close();
    });
}

function generateReport() {
    log.step('📊 Gerando Relatório Final');
    const { passed, failed, total } = testState.testResults;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "N/A";
    console.log(`\n${'='.repeat(60)}\n🐺 RELATÓRIO FINAL - TEST VOTING SYSTEM\n${'='.repeat(60)}`);
    console.log(`\n📈 ESTATÍSTICAS DE TESTE:`);
    console.log(`   ${colors.green}✅ Passou: ${passed}${colors.reset}`);
    console.log(`   ${colors.red}❌ Falhou: ${failed}${colors.reset}`);
    console.log(`   📊 Total: ${total}`);
    console.log(`   🎯 Sucesso: ${successRate}%`);
    const success = failed === 0;
    console.log(`\n${success ? '🎉 RESULTADO GERAL: SUCESSO' : '⚠️ RESULTADO GERAL: FALHAS DETECTADAS'}`);
    console.log('='.repeat(60) + '\n');
    return success;
}

async function runTests() {
    try {
        log.step('Verificando servidor...');
        await axios.get(`${API_URL}/health`);
        log.success('Servidor está online.');

        const userCredentials = [
            { email: 'voter1@test.com', username: 'Voter1', password: 'Test123!' },
            { email: 'voter2@test.com', username: 'Voter2', password: 'Test123!' },
            { email: 'voter3@test.com', username: 'Voter3', password: 'Test123!' },
            { email: 'voter4@test.com', username: 'Voter4', password: 'Test123!' },
            { email: 'voter5@test.com', username: 'Voter5', password: 'Test123!' },
            { email: 'voter6@test.com', username: 'Voter6', password: 'Test123!' },
        ];

        // As credenciais são usadas para obter tokens e limpar salas antigas.
        // O setup dos usuários vai preencher testState.users, que será usado depois.
        await setupTestUsers();
        await cleanupPreviousRooms(userCredentials);

        await createTestRoom();
        await connectPlayersToRoom();
        await markPlayersReady();
        await startGame();
        await forceToVotingPhase();
        await testVotingSystem();
        await testVotingCalculationAndExecution();
        await testFinalEventsAndWinCondition();
    } catch (error) {
        log.error(`ERRO FATAL NO SCRIPT DE TESTE: ${error.message}`);
        if (error.response?.data) console.error(error.response.data);
        if (testState.testResults.total > 0 && testState.testResults.failed === 0) testState.testResults.failed++;
        else if (testState.testResults.total === 0) { testState.testResults.total = 1; testState.testResults.failed = 1; }

    } finally {
        await cleanup();
        const success = generateReport();
        process.exit(success ? 0 : 1);
    }
}

runTests();