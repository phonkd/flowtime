# Docker Deployment Guide

This guide provides instructions for deploying the Hypnosis App using Docker.

## Deployment Options

### Option 1: Local Development

For local development and testing, use the standard `docker-compose.yml`:

```bash
docker-compose up -d
```

This builds the application from source code and sets up the PostgreSQL database.

### Option 2: Standalone Deployment

For production or remote deployment, use the standalone Docker Compose setup:

1. First, build and push the Docker image to your registry:

```bash
# Build the image
docker build -t your-registry/hypnosis-app:latest .

# Push to your registry
docker push your-registry/hypnosis-app:latest
```

2. Copy just the `docker-compose.standalone.yml` file to your server

3. Update the image reference in the file if needed:

```yaml
app:
  image: your-registry/hypnosis-app:latest
```

4. Deploy using the standalone file:

```bash
docker-compose -f docker-compose.standalone.yml up -d
```

## Important Notes

- The application will be available at http://localhost:5000
- Default admin credentials:
  - Username: admin
  - Password: admin123
- No sample data is included, all categories and tracks need to be created by the admin
- Uploaded files are stored in a Docker volume for persistence
- Database data is stored in a separate volume

## Environment Variables

You can customize the deployment by changing these environment variables in the Docker Compose file:

- `NODE_ENV`: Set to "production" for production deployments
- `USE_DATABASE`: Set to "true" to use PostgreSQL, "false" for in-memory storage
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database credentials
- `SESSION_SECRET`: Secret key for session encryption

## Database Configuration

The PostgreSQL database is configured with optimized settings for better performance. If you need to modify these settings, you can adjust the command parameters in the docker-compose file.

## Data Persistence

All data is stored in Docker volumes:
- `postgres_data`: Database files
- `hypnosis_uploads`: Uploaded audio files and images

## Troubleshooting

- If the application fails to connect to PostgreSQL, check that the database container is running and healthy
- For database issues, you can connect directly to PostgreSQL:
  ```bash
  docker exec -it hypnosis-db psql -U hypnosis -d hypnosis_db
  ```
- To view logs:
  ```bash
  docker logs hypnosis-app
  ```