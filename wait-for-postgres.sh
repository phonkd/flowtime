#!/bin/bash
set -e

# More robust database connection check script for Docker environments
# This explicitly uses TCP/IP connection to avoid socket connection issues
#
# DATABASE INITIALIZATION PROCESS:
# The application now initializes the database automatically via server/db.ts
# using a robust multi-step process that:
#
# 1. Tests PostgreSQL connectivity with appropriate retry mechanism
# 2. Checks for existing database schema using direct SQL queries
# 3. Creates tables if they don't exist using raw SQL (not ORM functions)
# 4. Seeds initial data (admin user, categories, tags, sample tracks)
# 5. Sets up relationships between entities
# 6. Performs direct SQL COUNT queries to update category counts
#
# This approach is significantly more reliable than the previous method as it:
# - Uses direct SQL queries instead of relying on ORM count methods
# - Handles errors gracefully with proper try/catch blocks
# - Provides detailed logging for troubleshooting
# - Safely skips seeding if data already exists
# 
# FALLBACK MECHANISM:
# The init-db.sh script is still available as a fallback option and can be 
# enabled by uncommenting the volume mount in docker-compose.yml if needed.

# Connection parameters (use environment variables or defaults)
PG_HOST=${POSTGRES_HOST:-postgres}
PG_PORT=${POSTGRES_PORT:-5432}
PG_USER=${POSTGRES_USER:-hypnosis}
PG_PASSWORD=${POSTGRES_PASSWORD:-hypnosis_password}
PG_DB=${POSTGRES_DB:-hypnosis_db}

# Maximum number of connection attempts
MAX_RETRIES=30
# Delay between retries in seconds
RETRY_DELAY=2

echo "Waiting for PostgreSQL to be ready at $PG_HOST:$PG_PORT..."
echo "Using explicit TCP connection with -h flag to force TCP/IP mode"

# Connection counter
RETRIES=0

# Loop until connected or max retries reached
until PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT 1" > /dev/null 2>&1; do
  RETRIES=$((RETRIES+1))
  
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "Failed to connect to PostgreSQL after $MAX_RETRIES attempts. Giving up."
    exit 1
  fi
  
  echo "PostgreSQL is unavailable - sleeping for $RETRY_DELAY seconds (attempt $RETRIES/$MAX_RETRIES)"
  sleep $RETRY_DELAY
done

echo "PostgreSQL is up and running! Executing command: $@"
exec "$@"