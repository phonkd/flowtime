#!/bin/sh
set -e

echo "Starting application setup..."

# Install dependencies if node_modules doesn't exist or if package.json has changed
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
  echo "Installing dependencies..."
  npm ci
fi

# Run database migration if needed
if [ "$USE_DATABASE" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "Setting up database..."
  # Wait for PostgreSQL to be ready - retry up to 30 times with a 2 second delay
  RETRIES=30
  until npm run db:push || [ $RETRIES -eq 0 ]; do
    echo "Waiting for database to be ready... ($RETRIES retries left)"
    RETRIES=$((RETRIES-1))
    sleep 2
  done
  
  if [ $RETRIES -eq 0 ]; then
    echo "Error: Failed to connect to database after multiple attempts"
    exit 1
  fi
fi

# Execute command passed to the script
echo "Starting application..."
exec "$@"