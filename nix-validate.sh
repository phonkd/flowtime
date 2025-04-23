#!/usr/bin/env bash
# Script to validate and test the Nix flake configuration

set -e

echo "Starting Nix flake validation..."

# Check if Nix with flakes is available
if ! command -v nix &> /dev/null; then
  echo "Error: Nix is not installed."
  echo "Please install Nix first: https://nixos.org/download.html"
  exit 1
fi

# Check if flakes are enabled
if ! nix --version | grep -q "nix-env"; then
  echo "Checking if flakes are enabled..."
  if ! grep -q "experimental-features = nix-command flakes" ~/.config/nix/nix.conf 2>/dev/null; then
    echo "Warning: Flakes might not be enabled."
    echo "Add 'experimental-features = nix-command flakes' to your Nix configuration."
  fi
fi

echo "Validating flake.nix syntax..."
# Check if flake.nix exists and is valid
if [ ! -f "flake.nix" ]; then
  echo "Error: flake.nix not found in the current directory."
  exit 1
fi

# Run a flake check (this validates the flake without building)
echo "Running 'nix flake check'..."
nix flake check

# Show the flake outputs
echo "Showing flake outputs..."
nix flake show

# Option to build the package
read -p "Do you want to build the package? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Building package..."
  nix build
  
  echo "Package built successfully. Binary is available at ./result/bin/hypnosis-audio-platform"
  echo "You can run it with: ./result/bin/hypnosis-audio-platform"
fi

# Option to start a development shell
read -p "Do you want to start a development shell? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Starting development shell..."
  nix develop
fi

echo "Validation completed successfully!"