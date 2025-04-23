# Hypnosis Audio Platform Deployment Guide

This document explains how to deploy the Hypnosis Audio Platform using different methods.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Compose Development](#docker-compose-development)
4. [Manual Production Deployment](#manual-production-deployment)
5. [GitHub Actions Automated Deployment](#github-actions-automated-deployment)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL (for database persistence)
- Git (for GitHub Actions deployment)

## Local Development

For local development without Docker:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at http://localhost:5000.

## Docker Compose Development

### Option 1: Build from source (recommended for development)

```bash
# Start the application and PostgreSQL database
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 2: Use pre-built container images

This method doesn't build the application locally but uses the node:18-alpine image and mounts the code:

```bash
# Start the application using the independent docker-compose file
docker-compose -f docker-compose-independent.yml up -d

# View logs
docker-compose -f docker-compose-independent.yml logs -f
```

## Manual Production Deployment

For a manual production deployment:

```bash
# Build the application
npm run check
npm run build

# Start the application in production mode
NODE_ENV=production npm start
```

## GitHub Actions Automated Deployment

The repository includes GitHub Actions workflows that automatically build and push Docker images to GitHub Container Registry (GHCR):

### How It Works

1. When you push to the `main` branch or create a release tag, GitHub Actions will:
   - Build the application Docker image
   - Build the database Docker image with sample data
   - Push both images to GitHub Container Registry
   - Generate a deployment-ready `docker-compose.prod.yml` file

2. To deploy using the pre-built images from GHCR:

```bash
# Log in to GitHub Container Registry (if needed)
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin

# Download the docker-compose.prod.yml from the latest GitHub Actions run artifacts
# Create a .env file with your environment variables

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

### Customizing the GitHub Actions Workflow

The GitHub Actions workflows are defined in `.github/workflows/`:

- `docker-publish.yml`: Builds and publishes a single application Docker image
- `docker-compose-publish.yml`: Builds and publishes both application and database Docker images

You can customize these workflows by editing these files.

## Environment Variables

The application requires the following environment variables:

- `NODE_ENV`: Environment (`development` or `production`)
- `USE_DATABASE`: Set to `true` to use a PostgreSQL database, `false` for in-memory storage
- `DATABASE_URL`: PostgreSQL connection string when `USE_DATABASE=true`
- `SESSION_SECRET`: Secret for session encryption

For local development, you can create a `.env` file based on `.env.example`.

## Database Setup

The application supports both in-memory storage and PostgreSQL persistence:

### Using In-Memory Storage

Set `USE_DATABASE=false` in your environment variables.

### Using PostgreSQL

1. Set `USE_DATABASE=true` and provide a valid `DATABASE_URL`
2. Run database migrations: `npm run db:push`

### Initial Data

When using Docker Compose, the database is automatically populated with sample data using the `init-db.sh` script.

## Troubleshooting

### Connection Issues

If the application fails to connect to the database with an error about port 443, make sure your `DATABASE_URL` is in the proper format. For local PostgreSQL or Docker Compose deployment, use:

```
postgresql://username:password@hostname:5432/database_name
```

### Container Errors

If containers fail to start:

1. Check logs: `docker-compose logs app` or `docker-compose logs postgres`
2. Verify environment variables in your `.env` file
3. Ensure PostgreSQL is properly initialized: `docker-compose exec postgres psql -U hypnosis -c "SELECT count(*) FROM users;"`