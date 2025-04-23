# Deployment Guide for Hypnosis App

This document provides instructions for deploying the Hypnosis application using GitHub Container Registry (GHCR) and Docker Compose.

## GitHub Actions Setup

The repository contains two GitHub Actions workflows:

1. `docker-publish.yml` - Builds and pushes the application Docker image to GHCR
2. `docker-compose-publish.yml` - Builds and pushes both the application and database images to GHCR, and generates a production docker-compose file

## Prerequisites

- GitHub repository with the Hypnosis application code
- Permission to create GitHub Actions and Packages in the repository

## Automatic Deployment via GitHub Actions

The application is automatically built and published to GitHub Container Registry when:

- You push to the `main` branch
- You create and push a tag following semantic versioning (e.g., `v1.0.0`)

### Setting up GitHub Actions Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secret:
   - `SESSION_SECRET` - A strong random string for session encryption

## Manual Deployment

To deploy manually using the published Docker images:

1. Download the `docker-compose.prod.yml` file from the latest GitHub Actions run artifacts
2. Create a `.env` file with the following content:
   ```
   SESSION_SECRET=your_secure_session_secret_here
   ```
3. Run the application with:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Accessing the Application

Once deployed, the application will be available at:

- Application: `http://localhost:5000`
- Database: `postgres://hypnosis:hypnosis_password@localhost:5432/hypnosis_db`

## Default Admin Credentials

The database comes pre-populated with an admin user:

- Username: `admin`
- Password: `admin123`

**Important:** Change the admin password after first login in a production environment.

## Database Persistence

The PostgreSQL database data is stored in a Docker volume named `postgres_data`. This ensures your data persists across container restarts.

## Custom Deployment Configuration

If you need to customize the deployment, you can modify the `docker-compose.prod.yml` file. Common customizations include:

- Changing port mappings
- Adding SSL/TLS termination
- Connecting to external services

## Troubleshooting

If you encounter issues:

1. Check the container logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   docker-compose -f docker-compose.prod.yml logs postgres
   ```

2. Verify the database connection:
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres psql -U hypnosis -d hypnosis_db -c "SELECT count(*) FROM users;"
   ```

3. Restart the services:
   ```bash
   docker-compose -f docker-compose.prod.yml restart
   ```