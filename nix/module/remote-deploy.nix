# Remote deployment configuration for NixOS
# You can use this file directly without cloning the repository
# Save as configuration.nix or import into your existing NixOS configuration

{ config, pkgs, lib, ... }:

let
  # Fetch the Hypnosis Audio Platform repository
  src = pkgs.fetchFromGitHub {
    owner = "yourusername";  # Replace with actual GitHub username
    repo = "hypnosis-audio-platform";
    # You can specify a specific version:
    # rev = "v1.0.0"; # For a release tag
    # rev = "main";   # For latest on main branch
    rev = "main";
    # This hash will change if the repo changes
    # To get the correct hash for a specific commit/tag, run:
    # nix-prefetch-github --rev [REVISION] [OWNER] [REPO]
    sha256 = "sha256-0000000000000000000000000000000000000000000000000000";
  };
  
  # Import the module directly from the fetched source
  hypnosisModule = import "${src}/nixos-module.nix";
in
{
  imports = [
    # Import the module
    hypnosisModule
  ];

  # Enable the Hypnosis Audio Platform service
  services.hypnosisAudioPlatform = {
    enable = true;
    port = 5000;
    
    # Security settings (CHANGE THESE!)
    sessionSecret = "your-secure-secret-key-here";
    
    # Domain settings
    enableNginx = true;
    domain = "hypnosis.example.com";  # Change to your domain
    
    # Database settings
    useDatabase = true;
    createDatabase = true;
    createSampleData = true;
    databaseUrl = "postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db";
  };

  # Enable SSL with Let's Encrypt (optional)
  security.acme = {
    acceptTerms = true;
    defaults.email = "your-email@example.com";  # Change to your email
  };

  services.nginx.virtualHosts."hypnosis.example.com" = {
    enableACME = true;
    forceSSL = true;
  };

  # Firewall settings
  networking.firewall.allowedTCPPorts = [ 80 443 5000 ];
}