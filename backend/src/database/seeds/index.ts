// 🐺 LOBISOMEM ONLINE - Database Seeds
// Create initial test data for development

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

//======================================================================

// SEED USERS
//======================================================================

async function seedUsers() {
    logger.info('Seeding users...');

    const testUsers = [
        {
            email: 'admin@werewolf.com',
            username: 'AdminMaster',
            password: 'admin123',
            level: 10,
            totalGames: 50,
            totalWins: 35,
            totalLosses: 15,
        },
        {
            email: 'player1@test.com',
            username: 'LobisomemHunter',
            password: 'player123',
            level: 5,
            totalGames: 25,
            totalWins: 15,
            totalLosses: 10,
        },
        {
            email: 'player2@test.com',
            username: 'VillagerPro',
            password: 'player123',
            level: 3,
            totalGames: 15,
            totalWins: 8,
            totalLosses: 7,
        },
        {
            email: 'player3@test.com',
            username: 'SheriffExpert',
            password: 'player123',
            level: 7,
            totalGames: 35,
            totalWins: 22,
            totalLosses: 13,
        },
        {
            email: 'player4@test.com',
            username: 'DoctorHealer',
            password: 'player123',
            level: 4,
            totalGames: 20,
            totalWins: 12,
            totalLosses: 8,
        },
        {
            email: 'player5@test.com',
            username: 'AlphaWolf',
            password: 'player123',
            level: 6,
            totalGames: 30,
            totalWins: 18,
            totalLosses: 12,
        },
        {
            email: 'newbie@test.com',
            username: 'Newbie2025',
            password: 'newbie123',
            level: 1,
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0,
        },
    ];

    for (const userData of testUsers) {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: userData.email },
                    { username: userData.username },
                ],
            },
        });

        if (existingUser) {
            logger.info(`User ${userData.username} already exists, skipping...`);
            continue;
        }

        // Calculate win rate
        const winRate = userData.totalGames > 0
            ? Number((userData.totalWins / userData.totalGames).toFixed(4))
            : 0;

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: userData.email,
                username: userData.username,
                passwordHash,
                level: userData.level,
                totalGames: userData.totalGames,
                totalWins: userData.totalWins,
                totalLosses: userData.totalLosses,
                winRate,
                lastLoginAt: new Date(),
            },
        });

        logger.info(`Created user: ${user.username} (${user.email})`);
    }

    logger.info('Users seeding completed!');
}

//======================================================================

// SEED ACHIEVEMENTS
//======================================================================

async function seedAchievements() {
    logger.info('Seeding achievements...');

    const achievements = [
        {
            key: 'first_game',
            name: 'Primeira Partida',
            description: 'Jogue sua primeira partida',
            icon: '🎮',
            category: 'first_time',
            points: 10,
            conditions: { gamesPlayed: 1 },
        },
        {
            key: 'first_win',
            name: 'Primeira Vitória',
            description: 'Vença sua primeira partida',
            icon: '🏆',
            category: 'first_time',
            points: 25,
            conditions: { wins: 1 },
        },
        {
            key: 'survivor',
            name: 'Sobrevivente',
            description: 'Sobreviva até o final da partida 10 vezes',
            icon: '💀',
            category: 'survival',
            points: 50,
            conditions: { survivals: 10 },
        },
        {
            key: 'werewolf_master',
            name: 'Mestre dos Lobisomens',
            description: 'Vença 5 partidas como Lobisomem',
            icon: '🐺',
            category: 'role_mastery',
            points: 75,
            conditions: { werewolf_wins: 5 },
        },
        {
            key: 'sheriff_detective',
            name: 'Detetive Expert',
            description: 'Vença 5 partidas como Sheriff',
            icon: '🕵️',
            category: 'role_mastery',
            points: 75,
            conditions: { sheriff_wins: 5 },
        },
        {
            key: 'doctor_savior',
            name: 'Salvador de Vidas',
            description: 'Salve 10 jogadores como Doctor',
            icon: '⚕️',
            category: 'role_mastery',
            points: 100,
            conditions: { lives_saved: 10 },
        },
        {
            key: 'social_butterfly',
            name: 'Borboleta Social',
            description: 'Envie 100 mensagens no chat',
            icon: '💬',
            category: 'social',
            points: 30,
            conditions: { messages_sent: 100 },
        },
        {
            key: 'win_streak_5',
            name: 'Sequência de Vitórias',
            description: 'Vença 5 partidas consecutivas',
            icon: '🔥',
            category: 'strategic',
            points: 150,
            conditions: { win_streak: 5 },
        },
        {
            key: 'jester_trickster',
            name: 'Enganador',
            description: 'Vença como Jester',
            icon: '🃏',
            category: 'special',
            points: 200,
            conditions: { jester_wins: 1 },
        },
        {
            key: 'serial_killer_psycho',
            name: 'Psicopata',
            description: 'Vença como Serial Killer',
            icon: '🔪',
            category: 'special',
            points: 250,
            conditions: { serial_killer_wins: 1 },
        },
    ];

    for (const achData of achievements) {
        // Check if achievement already exists
        const existing = await prisma.achievement.findUnique({
            where: { key: achData.key },
        });

        if (existing) {
            logger.info(`Achievement ${achData.key} already exists, skipping...`);
            continue;
        }

        // Create achievement
        const achievement = await prisma.achievement.create({
            data: achData,
        });

        logger.info(`Created achievement: ${achievement.name}`);
    }

    logger.info('Achievements seeding completed!');
}

//======================================================================

// MAIN SEED FUNCTION
//======================================================================

async function main() {
    try {
        logger.info('🌱 Starting database seeding...');

        await seedUsers();
        await seedAchievements();

        logger.info('✅ Database seeding completed successfully!');

        // Log test user credentials
        console.log('\n🔑 TEST USER CREDENTIALS:');
        console.log('Admin: admin@werewolf.com / admin123');
        console.log('Player 1: player1@test.com / player123');
        console.log('Player 2: player2@test.com / player123');
        console.log('Player 3: player3@test.com / player123');
        console.log('Player 4: player4@test.com / player123');
        console.log('Player 5: player5@test.com / player123');
        console.log('Newbie: newbie@test.com / newbie123');
        console.log('');

    } catch (error) {
        logger.error('Seeding failed', error instanceof Error ? error : new Error('Unknown seeding error'));
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

//======================================================================

// RUN SEEDS IF CALLED DIRECTLY
//======================================================================
if (require.main === module) {
    main();
}

export { main as runSeeds };