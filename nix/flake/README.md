# Nix Flake for Hypnosis Audio Platform

This directory contains Nix Flake configurations for deploying the Hypnosis Audio Platform.

## File Overview

- `flake.nix` - The main flake configuration for this repository
- `remote-deploy.nix` - Example flake configuration for deploying from GitHub

## Usage

### Local Deployment (After Cloning)

1. Make sure you have flakes enabled in your Nix configuration:

```bash
# In your nix.conf or /etc/nix/nix.conf
experimental-features = nix-command flakes
```

2. Use the flake directly from this repository:

```bash
# Build the package
nix build .#hypnosisAudioPlatform

# Run the application
./result/bin/hypnosis-audio-platform

# Start a development shell
nix develop
```

3. Or add it to your NixOS configuration:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hypnosis-platform.url = "path:/path/to/this/repo";
  };
  
  outputs = { self, nixpkgs, hypnosis-platform, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        hypnosis-platform.nixosModules.default
      ];
    };
  };
}
```

### Remote Deployment (No Clone Required)

You can deploy directly from GitHub without cloning:

```nix
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
          };
        }
      ];
    };
  };
}
```

## Direct Usage

You can also run the application directly without system integration:

```bash
# Run directly from GitHub
nix run github:yourusername/hypnosis-audio-platform

# Build and run
nix build github:yourusername/hypnosis-audio-platform
./result/bin/hypnosis-audio-platform

# Development shell
nix develop github:yourusername/hypnosis-audio-platform
```