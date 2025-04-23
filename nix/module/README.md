# NixOS Module for Hypnosis Audio Platform

This directory contains the traditional NixOS module for deploying the Hypnosis Audio Platform.

## File Overview

- `nixos-module.nix` - The main NixOS module that defines the service
- `configuration-example.nix` - Example NixOS configuration that uses the module
- `remote-deploy.nix` - Configuration for deploying directly from GitHub

## Usage

### Local Deployment

1. Add the module to your NixOS configuration:

```nix
{ config, pkgs, ... }:
{
  imports = [
    # Path to the module file
    ./path/to/nixos-module.nix
  ];
  
  services.hypnosisAudioPlatform = {
    enable = true;
    sessionSecret = "your-secure-secret";
    domain = "hypnosis.example.com";
    # ... other options as needed
  };
}
```

2. Apply the configuration:

```bash
sudo nixos-rebuild switch
```

### Remote Deployment (No Clone Required)

To deploy without cloning the repository:

1. Save this to your NixOS configuration:

```nix
{ config, pkgs, lib, ... }:

let
  # Fetch the Hypnosis module from GitHub
  hypnosisModuleSrc = pkgs.fetchFromGitHub {
    owner = "yourusername";
    repo = "hypnosis-audio-platform";
    rev = "main";
    sha256 = "sha256-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; # Replace with actual hash
  };
  hypnosisModule = import "${hypnosisModuleSrc}/nix/module/nixos-module.nix";
in
{
  imports = [
    hypnosisModule
  ];
  
  services.hypnosisAudioPlatform = {
    enable = true;
    # ... other options as needed
  };
}
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `enable` | `false` | Enable the service |
| `port` | `5000` | Port to listen on |
| `useDatabase` | `true` | Whether to use PostgreSQL |
| `databaseUrl` | `"postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db"` | Database connection URL |
| `sessionSecret` | `"change-me-in-production"` | Secret for session encryption |
| `domain` | `"hypnosis.local"` | Domain for Nginx |
| `enableNginx` | `true` | Configure Nginx |

See `nixos-module.nix` for all available options.