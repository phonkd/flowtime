# Hypnosis Audio Platform

A web platform for browsing, categorizing, and playing hypnosis audio recordings with user management and administrative controls.

![Hypnosis Audio Platform](./attached_assets/grafik_1745398512278.png)

## Features

- Audio library with categories, tags, and search
- User accounts with progress tracking
- Admin dashboard for content management
- Privacy controls and sharing features
- Responsive design for all devices

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5000

### Using Docker

```bash
# Start with Docker Compose
docker-compose up -d
```

### Using Nix/NixOS

```bash
# Run directly (requires Nix with flakes enabled)
nix run github:yourusername/hypnosis-audio-platform

# Or from local checkout
nix run

# Development shell
nix develop
```

For NixOS systems, add to your configuration:

```nix
{
  inputs.hypnosis-platform.url = "github:yourusername/hypnosis-audio-platform";
  
  outputs = { nixpkgs, hypnosis-platform, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      # ...
      modules = [
        # ...
        hypnosis-platform.nixosModules.default
        { services.hypnosisAudioPlatform.enable = true; }
      ];
    };
  };
}
```

## Admin Access

Default admin credentials:
- **Username**: admin
- **Password**: admin123

## Project Structure

```
├── client/               # React frontend
├── server/               # Express backend
├── shared/               # Shared code
├── public/               # Static assets
├── flake.nix             # Nix flake for deployment
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Docker Compose setup
└── init-db.sh            # Database initialization
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js, PostgreSQL (optional), Drizzle ORM
- **Authentication**: Session-based with Passport.js

## License

MIT License - see LICENSE file for details.