# Hypnosis Audio Platform

A web platform for browsing, categorizing, and playing hypnosis audio recordings with advanced user management and administrative controls.

![Hypnosis Audio Platform](./attached_assets/grafik_1745398512278.png)

## Features

- **Audio Library**: Browse and play hypnosis audio tracks organized by categories
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Admin Dashboard**: Manage categories, tags, tracks, users, and sharing settings
- **User Management**: Register and login with secure authentication
- **Upload System**: Upload new audio tracks with metadata
- **Privacy Controls**: Control visibility of tracks and share privately with specific users
- **Shareable Links**: Generate temporary access links to share content
- **Playback Controls**: Intuitive audio player with progress tracking

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query for data fetching and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Session-based authentication with Passport.js

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database (optional - in-memory storage is used by default)

### Installation

#### Standard Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hypnosis-audio-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

#### Docker Installation

This application can be easily deployed using Docker Compose:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hypnosis-audio-platform
   ```

2. Start the application stack with Docker Compose:
   ```bash
   docker-compose up -d
   ```

#### Production Deployment

For manual production deployment:

1. Build the application:
   ```bash
   # Check TypeScript types
   npm run check
   
   # Build the client and server code
   npm run build
   ```

2. Set up the database:
   ```bash
   # Push schema to the database
   npx drizzle-kit push
   ```

3. Start the application:
   ```bash
   # Run in production mode
   NODE_ENV=production node dist/index.js
   ```

3. The application will be available at:
   ```
   http://localhost:5000
   ```

4. To stop the application:
   ```bash
   docker-compose down
   ```

5. To also remove persistent data volumes:
   ```bash
   docker-compose down -v
   ```

For environment variables in Docker, you can set them in a `.env` file and Docker will automatically load them. A sample `.env.example` file is provided as a template - copy it to `.env` and modify the values as needed.

## Admin Access

The application comes with a default admin account:

- **Username**: admin
- **Password**: admin123

Use these credentials to access the admin dashboard at `/admin`.

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main application component
├── server/               # Backend Express application
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data storage implementation
│   ├── vite.ts           # Vite server configuration
│   └── index.ts          # Server entry point
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema and types
└── public/               # Static assets
```

## API Endpoints

The application provides the following API endpoints:

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with existing credentials
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/user` - Get current authenticated user

### Content
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/tags` - Get all tags
- `GET /api/tracks` - Get all accessible audio tracks
- `GET /api/tracks/:id` - Get audio track by ID
- `GET /api/categories/:id/tracks` - Get tracks in a category
- `GET /api/search` - Search for audio tracks

### Progress Tracking
- `POST /api/progress` - Save user listening progress
- `GET /api/progress` - Get user's progress for all tracks

### Uploads
- `POST /api/uploads/audio` - Upload new audio file

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `POST /api/admin/categories` - Create category (admin only)
- `PUT /api/admin/categories/:id` - Update category (admin only)
- `DELETE /api/admin/categories/:id` - Delete category (admin only)
- `POST /api/admin/tags` - Create tag (admin only)
- `PUT /api/admin/tags/:id` - Update tag (admin only)
- `DELETE /api/admin/tags/:id` - Delete tag (admin only)
- `PUT /api/admin/tracks/:id` - Update track (admin only)
- `PATCH /api/admin/tracks/:id/visibility` - Toggle track visibility (admin only)
- `DELETE /api/admin/tracks/:id` - Delete track (admin only)

### Sharing
- `POST /api/shareable-links` - Create a shareable link
- `GET /api/shareable-links` - Get all shareable links
- `PUT /api/shareable-links/:id` - Update shareable link
- `DELETE /api/shareable-links/:id` - Delete shareable link
- `POST /api/track-access` - Grant user access to track (admin only)
- `DELETE /api/track-access/:userId/:audioTrackId` - Revoke user access (admin only)
- `GET /api/track-access/:audioTrackId/users` - Get users with access (admin only)

## License

This project is licensed under the MIT License - see the LICENSE file for details.