-- Garante que a extensão para UUIDs seja criada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários com UUID como chave primária
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL, -- "passwordHash" entre aspas por causa do case
    avatar TEXT,
    level INTEGER DEFAULT 1 NOT NULL,
    "totalGames" INTEGER DEFAULT 0 NOT NULL,
    "totalWins" INTEGER DEFAULT 0 NOT NULL,
    "totalLosses" INTEGER DEFAULT 0 NOT NULL,
    "winRate" DECIMAL(5, 4) DEFAULT 0.0000 NOT NULL, -- Maior precisão
    "createdAt" TIMESTAMPTZ DEFAULT NOW(), -- TIMESTAMPTZ é melhor para fusos horários
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastLoginAt" TIMESTAMPTZ
);

-- Tabela de salas
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(6) UNIQUE,
    "isPrivate" BOOLEAN DEFAULT false NOT NULL,
    "maxPlayers" INTEGER DEFAULT 15 NOT NULL,
    "maxSpectators" INTEGER DEFAULT 5 NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING' NOT NULL,
    "hostId" UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL, -- Evitar apagar salas se o host for deletado
    "serverId" VARCHAR(50) DEFAULT 'local-server',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Função para atualizar o campo "updatedAt" automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para usar a função acima
-- Dropa o trigger se ele já existir, para evitar erros ao rodar o script de novo
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();