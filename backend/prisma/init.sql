-- Initial database setup for Miracless Lottery Bot
-- This file runs when PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create database if it doesn't exist (this might not work in all PostgreSQL setups)
-- SELECT 'CREATE DATABASE miracless_db OWNER miracless_user'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miracless_db')\gexec

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE miracless_db TO miracless_user;
GRANT ALL ON SCHEMA public TO miracless_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO miracless_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO miracless_user;

-- Allow future grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO miracless_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO miracless_user;