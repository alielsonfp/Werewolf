// 🐺 LOBISOMEM ONLINE - Database Seeds (com node-postgres)
// Create initial test data for development

import { pool } from '../database';
import bcrypt from 'bcryptjs';

// Logger simples caso não tenha o logger configurado
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`);
    if (error) console.error(error);
  }
};

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
    try {
      // Check if user already exists
      const checkUserQuery = `
                SELECT id FROM users 
                WHERE email = $1 OR username = $2
            `;
      const existingUser = await pool.query(checkUserQuery, [userData.email, userData.username]);

      if (existingUser.rows.length > 0) {
        logger.info(`User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Calculate win rate
      const winRate = userData.totalGames > 0
        ? Number((userData.totalWins / userData.totalGames).toFixed(4))
        : 0;

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user with SQL
      const insertUserQuery = `
                INSERT INTO users (
                    email, 
                    username, 
                    "passwordHash", 
                    level, 
                    "totalGames", 
                    "totalWins", 
                    "totalLosses", 
                    "winRate",
                    "lastLoginAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, username, email
            `;

      const values = [
        userData.email,
        userData.username,
        passwordHash,
        userData.level,
        userData.totalGames,
        userData.totalWins,
        userData.totalLosses,
        winRate,
        new Date()
      ];

      const result = await pool.query(insertUserQuery, values);
      const createdUser = result.rows[0];

      logger.info(`Created user: ${createdUser.username} (${createdUser.email})`);

    } catch (error) {
      logger.error(`Failed to create user ${userData.username}:`, error as Error);
    }
  }

  logger.info('Users seeding completed!');
}

//======================================================================
// SEED ACHIEVEMENTS (Se você quiser implementar no futuro)
//======================================================================

async function seedAchievements() {
  // A tabela "achievements" não foi definida no seu init.sql atual.
  // Se você quiser implementar conquistas no futuro, pode descomentar e ajustar este código
  logger.warn('Skipping achievements seeding (table not defined in init.sql).');

  /* 
  // Exemplo de como seria se você tivesse a tabela achievements:
  
  logger.info('Seeding achievements...');

  const achievements = [
      {
          key: 'first_game',
          name: 'Primeira Partida',
          description: 'Jogue sua primeira partida',
          icon: '🎮',
          category: 'first_time',
          points: 10,
          conditions: JSON.stringify({ gamesPlayed: 1 }),
      },
      {
          key: 'first_win',
          name: 'Primeira Vitória',
          description: 'Vença sua primeira partida',
          icon: '🏆',
          category: 'first_time',
          points: 25,
          conditions: JSON.stringify({ wins: 1 }),
      },
      // ... mais conquistas
  ];

  for (const achData of achievements) {
      try {
          // Check if achievement already exists
          const checkQuery = 'SELECT id FROM achievements WHERE key = $1';
          const existing = await pool.query(checkQuery, [achData.key]);

          if (existing.rows.length > 0) {
              logger.info(`Achievement ${achData.key} already exists, skipping...`);
              continue;
          }

          // Create achievement
          const insertQuery = `
              INSERT INTO achievements (key, name, description, icon, category, points, conditions)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING key, name
          `;
          
          const values = [
              achData.key,
              achData.name,
              achData.description,
              achData.icon,
              achData.category,
              achData.points,
              achData.conditions
          ];

          const result = await pool.query(insertQuery, values);
          const achievement = result.rows[0];

          logger.info(`Created achievement: ${achievement.name}`);

      } catch (error) {
          logger.error(`Failed to create achievement ${achData.key}:`, error as Error);
      }
  }

  logger.info('Achievements seeding completed!');
  */
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
    console.log('=====================================');
    console.log('Admin: admin@werewolf.com / admin123');
    console.log('Player 1: player1@test.com / player123');
    console.log('Player 2: player2@test.com / player123');
    console.log('Player 3: player3@test.com / player123');
    console.log('Player 4: player4@test.com / player123');
    console.log('Player 5: player5@test.com / player123');
    console.log('Newbie: newbie@test.com / newbie123');
    console.log('=====================================\n');

  } catch (error) {
    logger.error('Seeding failed:', error instanceof Error ? error : new Error('Unknown seeding error'));
    process.exit(1);
  } finally {
    // Importante: fechar o pool para o script terminar
    await pool.end();
  }
}

//======================================================================
// RUN SEEDS IF CALLED DIRECTLY
//======================================================================

if (require.main === module) {
  main();
}

export { main as runSeeds };