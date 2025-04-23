# One-Line Deployment for Hypnosis Audio Platform

This document shows how to deploy the Hypnosis Audio Platform without cloning the repository, using simple one-liners.

## Direct Deployment with `nix run`

You can run the Hypnosis Audio Platform directly without installing or cloning using `nix run`:

```bash
# Run the latest version from GitHub
nix run github:yourusername/hypnosis-audio-platform

# Run a specific version
nix run github:yourusername/hypnosis-audio-platform/v1.0.0
```

## Quick NixOS Installation

Add the Hypnosis Audio Platform to your NixOS configuration in a single command:

```bash
# Get the module and add it to your configuration
curl -s https://raw.githubusercontent.com/yourusername/hypnosis-audio-platform/main/nixos-module.nix > /etc/nixos/hypnosis-module.nix

# Now edit your configuration.nix to import it
cat >> /etc/nixos/configuration.nix << 'EOF'

# Import Hypnosis Audio Platform
imports = [
  # ... your existing imports
  ./hypnosis-module.nix
];

# Configure the service
services.hypnosisAudioPlatform = {
  enable = true;
  sessionSecret = "change-this-to-a-secure-secret";
  domain = "your-domain.com";
};
EOF

# Apply the configuration
nixos-rebuild switch
```

## Direct Installation with Flakes

If you're using flakes, you can deploy without manually downloading any files:

1. Create or edit your `flake.nix`:

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
        { services.hypnosisAudioPlatform.enable = true; }
      ];
    };
  };
}
```

2. Apply the configuration:

```bash
nixos-rebuild switch --flake .
```

## Temporary Testing

You can also quickly test the application without making permanent changes:

```bash
# Run a temporary nix shell with the application
nix shell github:yourusername/hypnosis-audio-platform

# Or directly build and run in one step
nix build github:yourusername/hypnosis-audio-platform && ./result/bin/hypnosis-audio-platform
```