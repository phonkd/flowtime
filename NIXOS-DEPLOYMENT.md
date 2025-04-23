# NixOS Deployment Guide for Hypnosis Audio Platform

This document explains how to deploy the Hypnosis Audio Platform using Nix and NixOS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Using Nix Flakes](#using-nix-flakes)
4. [Traditional NixOS Deployment](#traditional-nixos-deployment)
5. [Development Environment](#development-environment)
6. [Customization Options](#customization-options)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- NixOS operating system or Nix package manager
- Basic understanding of Nix/NixOS configuration
- For Flakes: Nix with flakes enabled (add `experimental-features = nix-command flakes` to your `nix.conf`)

## Deployment Options

There are several ways to deploy the Hypnosis Audio Platform with Nix:

1. **Using Nix Flakes (recommended)**: Modern, reproducible deployments
2. **Traditional NixOS modules**: Compatible with older Nix versions
3. **Development shell**: For local development

## Using Nix Flakes

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/hypnosis-audio-platform.git
cd hypnosis-audio-platform

# Deploy as a NixOS module (add to your flake.nix inputs)
# In your NixOS flake.nix:
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hypnosis-platform.url = "github:yourusername/hypnosis-audio-platform";
  };
  
  outputs = { self, nixpkgs, hypnosis-platform, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        hypnosis-platform.nixosModules.default
        {
          services.hypnosisAudioPlatform = {
            enable = true;
            sessionSecret = "your-secure-secret";
            domain = "your-domain.com";
          };
        }
      ];
    };
  };
}
```

### Building the Package Directly

```bash
# Build the package
nix build .#hypnosisAudioPlatform

# Run the application
./result/bin/hypnosis-audio-platform

# Enter development shell
nix develop
```

## Traditional NixOS Deployment

If you're not using flakes, you can still deploy using traditional Nix:

### In your configuration.nix:

```nix
{ config, pkgs, ... }:

let
  hypnosis-src = pkgs.fetchFromGitHub {
    owner = "yourusername";
    repo = "hypnosis-audio-platform";
    rev = "main"; # or specify a commit hash
    sha256 = "sha256-..."; # use `nix-prefetch-git` to get this
  };
in
{
  imports = [
    "${hypnosis-src}/nixos-module.nix"
  ];
  
  services.hypnosisAudioPlatform = {
    enable = true;
    # other options as needed
  };
}
```

### Or locally:

```nix
{ config, pkgs, ... }:

{
  imports = [
    ./path/to/hypnosis-audio-platform/nixos-module.nix
  ];
  
  services.hypnosisAudioPlatform = {
    enable = true;
    # other options as needed
  };
}
```

## Development Environment

```bash
# Using flakes
nix develop

# Or traditional nix-shell
nix-shell

# This gives you a shell with Node.js, PostgreSQL, and other dependencies
```

## Customization Options

The NixOS module supports the following options:

| Option | Default | Description |
|--------|---------|-------------|
| `enable` | `false` | Enable the Hypnosis Audio Platform service |
| `port` | `5000` | Port to listen on |
| `useDatabase` | `true` | Whether to use PostgreSQL database |
| `databaseUrl` | `"postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db"` | PostgreSQL connection URL |
| `sessionSecret` | `"change-me-in-production"` | Secret for session encryption |
| `user` | `"hypnosis"` | User to run the service |
| `group` | `"hypnosis"` | Group to run the service |
| `createDatabase` | `true` | Whether to create the PostgreSQL database |
| `createSampleData` | `true` | Whether to initialize sample data |
| `enableNginx` | `true` | Whether to configure Nginx as a reverse proxy |
| `domain` | `"hypnosis.local"` | Domain name for the Nginx virtual host |

See `nixos-module.nix` for full option details.

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure the path to the module is correct in your imports
2. **Database connection error**: Check the `databaseUrl` option and ensure PostgreSQL is running
3. **Permission denied**: Check that the `user` and `group` options are correct and have necessary permissions

### Logs and Debugging

```bash
# View service logs
journalctl -u hypnosis-audio-platform -f

# Check service status
systemctl status hypnosis-audio-platform

# Check PostgreSQL status
systemctl status postgresql
```

### Nix Flake Cache

If rebuilding frequently, consider using a flake cache like Cachix:

```bash
# Set up cachix
nix-env -iA cachix -f https://cachix.org/api/v1/install
cachix use your-cache-name

# Push to cache after building
nix build
cachix push your-cache-name ./result
```