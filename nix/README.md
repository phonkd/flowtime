# NixOS Deployment Options for Hypnosis Audio Platform

This directory contains various options for deploying the Hypnosis Audio Platform using Nix and NixOS.

## Directory Structure

- `module/` - NixOS module files for traditional deployment
  - `nixos-module.nix` - The core NixOS module
  - `configuration-example.nix` - Example NixOS configuration
  - `remote-deploy.nix` - Deploy directly from GitHub

- `flake/` - Nix Flake deployment files
  - `flake.nix` - Main flake file
  - `remote-deploy.nix` - Deploy from GitHub using flakes

- `oneshot/` - One-time deployment options
  - `install-as-package.nix` - Install as a system package
  - `README.md` - One-line deployment instructions

## Quick Start

Choose the deployment method that best fits your needs:

### 1. Nix Flakes (Modern)

Recommended for most deployments. Add this to your `flake.nix`:

```nix
{
  inputs.hypnosis-platform.url = "github:yourusername/hypnosis-audio-platform";
  
  outputs = { self, nixpkgs, hypnosis-platform, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      # ... rest of your configuration
      modules = [
        # Your existing modules
        hypnosis-platform.nixosModules.default
        { services.hypnosisAudioPlatform.enable = true; }
      ];
    };
  };
}
```

### 2. Traditional NixOS Module

For older NixOS systems or when flakes are not an option:

```nix
{ config, pkgs, ... }:
{
  imports = [
    ./nix/module/nixos-module.nix
  ];
  
  services.hypnosisAudioPlatform = {
    enable = true;
    # Additional configuration as needed
  };
}
```

### 3. Remote Deployment (No Clone Required)

```bash
# Direct one-liner
nix run github:yourusername/hypnosis-audio-platform

# Or install as a system package
nix-env -i -f https://github.com/yourusername/hypnosis-audio-platform/raw/main/nix/oneshot/install-as-package.nix
```

## Detailed Documentation

For complete deployment instructions, see the detailed documentation:

- For traditional NixOS modules: Read `/nix/module/README.md`
- For Nix Flakes: Read `/nix/flake/README.md`
- For one-shot commands: Read `/nix/oneshot/README.md`

Or refer to the comprehensive guide in this directory for all methods.