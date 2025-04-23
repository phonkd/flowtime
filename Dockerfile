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

# Make init-db.sh executable
RUN chmod +x ./init-db.sh

# Build frontend and backend assets (if needed)
RUN npm run build || echo "No build script found, continuing..."

# Verify the build output
RUN ls -la dist/ || echo "No dist directory, development mode will be used"

# Set environment variables (default values, can be overridden at runtime)
ENV NODE_ENV=development
ENV PORT=5000
ENV USE_DATABASE=true

# Wait for PostgreSQL script
COPY <<EOF /app/wait-for-postgres.sh
#!/bin/bash
set -e

host="postgres"
port="5432"
user="\${POSTGRES_USER:-hypnosis}"
database="\${POSTGRES_DB:-hypnosis_db}"

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD="\${POSTGRES_PASSWORD}" psql -h "$host" -p "$port" -U "$user" -d "$database" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping for 2 seconds"
  sleep 2
done

echo "PostgreSQL is up - executing command"
exec "$@"
EOF

RUN chmod +x /app/wait-for-postgres.sh

# Expose port
EXPOSE 5000

# Start the application with proper startup sequence
CMD ["/app/wait-for-postgres.sh", "npm", "run", "dev"]