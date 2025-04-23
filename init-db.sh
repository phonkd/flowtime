#!/bin/bash
set -e

# Initialize the PostgreSQL database for the Hypnosis app
# This script will be mounted inside the Postgres container and run on startup

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create a hyponsis database since some scripts might be directly referring to it
    CREATE DATABASE hypnosis;
    GRANT ALL PRIVILEGES ON DATABASE hypnosis TO $POSTGRES_USER;
    
    -- Log the initialization
    \echo 'Database initialization completed'
EOSQL