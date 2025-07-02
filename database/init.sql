-- 🐺 LOBISOMEM ONLINE - Database Initialization
-- Initial database setup for PostgreSQL

-- Create database if not exists (PostgreSQL doesn't support this syntax, but docker will handle it)
-- The database is created via POSTGRES_DB environment variable

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types (these will be handled by Prisma migrations)
-- But we can create some functions for future use

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_win_rate(total_wins INTEGER, total_games INTEGER)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    IF total_games = 0 THEN
        RETURN 0.0;
    END IF;
    RETURN ROUND((total_wins::DECIMAL / total_games::DECIMAL), 4);
END;
$$ LANGUAGE plpgsql;

-- Function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Initial notification for successful setup
SELECT 'Database initialized successfully!' as status;