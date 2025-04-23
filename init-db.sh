#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create schema if users table doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
            -- Create admin user with password 'admin123'
            INSERT INTO users (username, password, email, is_admin, created_at)
            VALUES ('admin', 'e95e5813ec3cacc21ed6a90479d44bb0.ee45b69066f2d1ea87bd265ed3d0eb1866de2c67fa1a4cc4', 'admin@example.com', true, CURRENT_TIMESTAMP);
            
            -- Create sample data (categories, tags, etc.)
            -- Code to insert sample data would go here
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            -- Tables don't exist yet, the application will create them on first run
            RAISE NOTICE 'Tables do not exist yet. They will be created by the application.';
    END
    \$\$;
EOSQL