# Example NixOS configuration that uses the Hypnosis Audio Platform flake
# Save this as configuration.nix on your NixOS system

{ config, pkgs, ... }:

{
  # Your existing NixOS configuration...
  
  # Import the flake inputs
  inputs.hypnosis-platform.url = "github:yourusername/hypnosis-audio-platform";
  
  # Flake-based module configuration
  imports = [
    # Your existing imports...
    hypnosis-platform.nixosModules.default
  ];
  
  # Enable and configure the hypnosis service
  services.hypnosisAudioPlatform = {
    enable = true;
    port = 5000;
    useDatabase = true;
    sessionSecret = "change-this-to-a-secure-random-string";
    
    # Optional: database configuration if using PostgreSQL
    databaseUrl = "postgresql://hypnosis:password@localhost:5432/hypnosis_db";
    
    # Optional: configure user/group
    user = "hypnosis";
    group = "hypnosis";
    
    # Optional: database setup
    createDatabase = true; 
    createSampleData = true;
  };
  
  # Allow traffic to the service
  networking.firewall.allowedTCPPorts = [ 5000 ];
  
  # Set up nginx as a reverse proxy (optional but recommended)
  services.nginx = {
    enable = true;
    virtualHosts."hypnosis.example.com" = {
      enableACME = true;  # For Let's Encrypt SSL
      forceSSL = true;
      locations."/" = {
        proxyPass = "http://localhost:5000";
        proxyWebsockets = true;
      };
    };
  };
}