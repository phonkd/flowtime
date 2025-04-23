# Example NixOS configuration showing how to deploy the Hypnosis Audio Platform
# Save this as configuration.nix or include in an existing NixOS configuration

{ config, pkgs, ... }:

{
  imports = [
    # Import the module directly
    ./nixos-module.nix
    
    # If using flakes, the import would look like this instead:
    # hypnosisAudioPlatform.nixosModules.default
  ];

  # Basic system configuration
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  
  networking.hostName = "hypnosis-server";
  networking.networkmanager.enable = true;
  
  # Enable the Hypnosis Audio Platform service
  services.hypnosisAudioPlatform = {
    enable = true;
    port = 5000;
    useDatabase = true;
    
    # Important: Change this in production!
    sessionSecret = "your-secure-secret-key-here";
    
    # Nginx reverse proxy configuration
    enableNginx = true;
    domain = "hypnosis.example.com";  # Change to your domain
    
    # Database configuration
    createDatabase = true;
    createSampleData = true;
    databaseUrl = "postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db";
  };

  # Enable SSL with Let's Encrypt
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

  # System packages
  environment.systemPackages = with pkgs; [
    vim
    git
    htop
    curl
  ];

  # User account
  users.users.admin = {
    isNormalUser = true;
    extraGroups = [ "wheel" "networkmanager" ];
    initialPassword = "changeme";
  };

  # This is just an example, you should use proper secrets management
  system.stateVersion = "23.11";
}