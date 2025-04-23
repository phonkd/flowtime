FROM node:20-alpine

# Install PostgreSQL client and other dependencies
RUN apk add --no-cache postgresql-client bash curl jq

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with development dependencies for build step
RUN npm ci

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Create wait-for-postgres.sh script directly in the container
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Connection parameters (use environment variables or defaults)\n\
PG_HOST=${POSTGRES_HOST:-postgres}\n\
PG_PORT=${POSTGRES_PORT:-5432}\n\
PG_USER=${POSTGRES_USER:-hypnosis}\n\
PG_PASSWORD=${POSTGRES_PASSWORD:-hypnosis_password}\n\
PG_DB=${POSTGRES_DB:-hypnosis_db}\n\
\n\
# Maximum number of connection attempts\n\
MAX_RETRIES=30\n\
# Delay between retries in seconds\n\
RETRY_DELAY=2\n\
\n\
echo "Waiting for PostgreSQL to be ready at $PG_HOST:$PG_PORT..."\n\
echo "Using explicit TCP connection with -h flag to force TCP/IP mode"\n\
\n\
# Connection counter\n\
RETRIES=0\n\
\n\
# Loop until connected or max retries reached\n\
until PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT 1" > /dev/null 2>&1; do\n\
  RETRIES=$((RETRIES+1))\n\
  \n\
  if [ $RETRIES -ge $MAX_RETRIES ]; then\n\
    echo "Failed to connect to PostgreSQL after $MAX_RETRIES attempts. Giving up."\n\
    exit 1\n\
  fi\n\
  \n\
  echo "PostgreSQL is unavailable - sleeping for $RETRY_DELAY seconds (attempt $RETRIES/$MAX_RETRIES)"\n\
  sleep $RETRY_DELAY\n\
done\n\
\n\
echo "PostgreSQL is up and running! Executing command: $@"\n\
exec "$@"' > /app/wait-for-postgres.sh

# Make the script executable
RUN chmod +x /app/wait-for-postgres.sh

# Create minimal init-db.sh script with only admin user
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Initialize the PostgreSQL database for the Hypnosis app\n\
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL\n\
    -- Create tables\n\
    CREATE TABLE IF NOT EXISTS "users" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "username" TEXT NOT NULL UNIQUE,\n\
        "password" TEXT NOT NULL,\n\
        "full_name" TEXT,\n\
        "email" TEXT,\n\
        "role" TEXT NOT NULL DEFAULT '\''user'\'',\n\
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "categories" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "name" TEXT NOT NULL UNIQUE,\n\
        "description" TEXT,\n\
        "image_url" TEXT,\n\
        "count" INTEGER NOT NULL DEFAULT 0\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "tags" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "name" TEXT NOT NULL UNIQUE\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "audio_tracks" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),\n\
        "title" TEXT NOT NULL,\n\
        "description" TEXT NOT NULL,\n\
        "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),\n\
        "image_url" TEXT,\n\
        "audio_url" TEXT NOT NULL,\n\
        "duration" INTEGER NOT NULL,\n\
        "is_public" BOOLEAN NOT NULL DEFAULT true\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "audio_track_tags" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,\n\
        "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,\n\
        UNIQUE("audio_track_id", "tag_id")\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "user_progress" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,\n\
        "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,\n\
        "progress" INTEGER NOT NULL DEFAULT 0,\n\
        "completed" BOOLEAN,\n\
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),\n\
        UNIQUE("user_id", "audio_track_id")\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "shareable_links" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),\n\
        "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,\n\
        "link_id" TEXT NOT NULL UNIQUE,\n\
        "created_by_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,\n\
        "expires_at" TIMESTAMP,\n\
        "is_active" BOOLEAN NOT NULL DEFAULT true\n\
    );\n\
\n\
    CREATE TABLE IF NOT EXISTS "user_track_access" (\n\
        "id" SERIAL PRIMARY KEY,\n\
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,\n\
        "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,\n\
        "granted_by_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,\n\
        "granted_at" TIMESTAMP NOT NULL DEFAULT NOW(),\n\
        UNIQUE("user_id", "audio_track_id")\n\
    );\n\
\n\
    -- Populate with only admin user as requested\n\
    -- Insert admin user with bcrypt hashed password for secure authentication\n\
    -- This is the bcrypt hash of '\''admin123'\'' with 10 rounds\n\
    INSERT INTO "users" ("username", "password", "full_name", "email", "role", "created_at")\n\
    VALUES ('\''admin'\'', '\''$2a$10$uVz7RbxcRn9Y.C0xvEHh9um.SjPx00W3RdLq5QQZ0GUm21ThJqt6W'\'', '\''Admin User'\'', '\''admin@example.com'\'', '\''admin'\'', NOW());\n\
\n\
    \\echo '\''Admin user created successfully!'\''\n\
EOSQL' > /app/init-db.sh

# Make the script executable
RUN chmod +x /app/init-db.sh

# Build frontend and backend assets (if needed)
RUN npm run build || echo "No build script found, continuing..."

# Verify the build output
RUN ls -la dist/ || echo "No dist directory, development mode will be used"

# Set environment variables (default values, can be overridden at runtime)
ENV NODE_ENV=development
ENV PORT=5000
ENV USE_DATABASE=true

# Expose port
EXPOSE 5000

# Start the application with proper startup sequence
CMD ["/app/wait-for-postgres.sh", "npm", "run", "dev"]