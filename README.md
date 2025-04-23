# Hypnosis Audio Platform

A web platform for discovering, managing, and experiencing hypnosis audio content.

## Features

- User accounts for favorites and history tracking
- Sleep timer functionality
- Background ambient sounds mixer
- Progressive download for large audio files
- Admin interface for content management
- User-specific sharing capabilities

## Docker Deployment

### Quick Start

The simplest way to deploy the application is with Docker Compose:

1. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   # Edit .env to set your configuration
   ```

2. Deploy with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Access the application at http://localhost:5000

### Environment Variables

The following environment variables can be customized in your `.env` file:

**Application Settings:**
- `NODE_ENV`: Set to "production" for production deployment (default: "production")
- `PORT`: Application port (default: 5000)
- `USE_DATABASE`: Set to "true" to use PostgreSQL (default: "true")
- `SESSION_SECRET`: Secret for session encryption (set a unique value in production)

**Database Settings:**
- `POSTGRES_USER`: PostgreSQL username (default: "postgres")
- `POSTGRES_PASSWORD`: PostgreSQL password (default: "postgres")
- `POSTGRES_DB`: PostgreSQL database name (default: "hypnosis")

**Docker Settings:**
- `APP_IMAGE`: Application image name (default: "hypnosis-audio-platform:latest")

### Custom Docker Image

To build and use a custom image:

1. Build the image:
   ```bash
   docker build -t hypnosis-audio-platform:latest .
   ```

2. Deploy with docker-compose:
   ```bash
   docker-compose up -d
   ```

### Data Persistence

The following data is persisted:
- PostgreSQL data: Stored in the `postgres_data` volume
- Uploaded audio files: Stored in the `app_uploads` volume

## Admin Access

Default admin credentials:
- Username: `admin`
- Password: `admin123`

**Important**: Change these credentials in production!

## Development

For local development without Docker:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```