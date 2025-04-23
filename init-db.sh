#!/bin/bash
set -e

echo "Running PostgreSQL initialization script"
echo "PostgreSQL user: $POSTGRES_USER"
echo "PostgreSQL database: $POSTGRES_DB"

# Create the database extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Ensure the postgres role exists (additional safeguard)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$POSTGRES_USER') THEN
            CREATE ROLE $POSTGRES_USER WITH LOGIN PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;
        END IF;
    END
    \$\$;
EOSQL

echo "Database initialization complete!"

# Note: We don't need to create sample data here
# The application will use DrizzleORM to create the tables when it first connects