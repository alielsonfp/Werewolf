


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION calculate_win_rate(total_wins INTEGER, total_games INTEGER)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    IF total_games = 0 THEN
        RETURN 0.0;
    END IF;
    RETURN ROUND((total_wins::DECIMAL / total_games::DECIMAL), 4);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;


CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    "passwordHash" TEXT,
    avatar TEXT,
    level INTEGER DEFAULT 1 NOT NULL,
    "totalGames" INTEGER DEFAULT 0 NOT NULL,
    "totalWins" INTEGER DEFAULT 0 NOT NULL,
    "totalLosses" INTEGER DEFAULT 0 NOT NULL,
    "winRate" DECIMAL(5, 4) DEFAULT 0.0000 NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastLoginAt" TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(6) UNIQUE,
    "isPrivate" BOOLEAN DEFAULT false NOT NULL,
    "maxPlayers" INTEGER DEFAULT 15 NOT NULL,
    "maxSpectators" INTEGER DEFAULT 5 NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING' NOT NULL,
    "hostId" UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    "serverId" VARCHAR(50) DEFAULT 'local-server',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);



DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);


SELECT 'Database initialized successfully!' as status;