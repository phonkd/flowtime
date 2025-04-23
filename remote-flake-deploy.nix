# Remote deployment using flakes - no cloning required
# Save this as flake.nix in your NixOS configuration directory

{
  description = "NixOS configuration with Hypnosis Audio Platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    
    # Direct reference to the Hypnosis Audio Platform repository
    hypnosis-platform = {
      url = "github:yourusername/hypnosis-audio-platform"; # Replace with actual username
      # You can pin to a specific commit or tag:
      # url = "github:yourusername/hypnosis-audio-platform/v1.0.0";
      # url = "github:yourusername/hypnosis-audio-platform/abcdef123456"; # Specific commit
    };
  };

  outputs = { self, nixpkgs, hypnosis-platform, ... }: {
    # Replace 'your-hostname' with your actual system hostname
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux"; # Replace with your system architecture if needed
      modules = [
        # Your existing configuration
        ./configuration.nix
        
        # Import the Hypnosis Audio Platform module directly
        hypnosis-platform.nixosModules.default
        
        # Configure the Hypnosis Audio Platform service
        {
          services.hypnosisAudioPlatform = {
            enable = true;
            sessionSecret = "your-secure-secret";
            domain = "hypnosis.example.com"; # Your domain name
            port = 5000;
            
            # Database settings
            useDatabase = true;
            createDatabase = true;
            databaseUrl = "postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db";
            
            # Optional: Create sample data
            createSampleData = true;
          };
          
          # Nginx and SSL settings
          services.nginx.virtualHosts."hypnosis.example.com" = {
            enableACME = true;
            forceSSL = true;
          };
          
          security.acme = {
            acceptTerms = true;
            defaults.email = "your-email@example.com";
          };
        }
      ];
    };
  };
}