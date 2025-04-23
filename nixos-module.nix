# Stand-alone NixOS module (can be imported directly without flake)
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.hypnosisAudioPlatform;
in
{
  options.services.hypnosisAudioPlatform = {
    enable = mkEnableOption "Hypnosis Audio Platform";

    package = mkOption {
      type = types.package;
      description = "The Hypnosis Audio Platform package to use";
      default = let
        # Simple derivation for when not using flakes
        hypnosisAudioPlatform = pkgs.stdenv.mkDerivation {
          pname = "hypnosis-audio-platform";
          version = "1.0.0";
          src = ./.;

          buildInputs = [
            pkgs.nodejs-18_x
            pkgs.nodePackages.typescript
            pkgs.postgresql_14
          ];

          buildPhase = ''
            export HOME=$(mktemp -d)
            npm ci
            npm run build
          '';

          installPhase = ''
            mkdir -p $out/bin
            mkdir -p $out/lib/hypnosis-audio-platform
            cp -r dist $out/lib/hypnosis-audio-platform/
            cp -r package.json $out/lib/hypnosis-audio-platform/
            cp -r package-lock.json $out/lib/hypnosis-audio-platform/
            cp -r node_modules $out/lib/hypnosis-audio-platform/
            cp -r public $out/lib/hypnosis-audio-platform/
            cp -r init-db.sh $out/lib/hypnosis-audio-platform/

            # Create a wrapper script
            cat > $out/bin/hypnosis-audio-platform <<EOF
            #!/usr/bin/env bash
            export NODE_ENV=production
            cd $out/lib/hypnosis-audio-platform
            exec ${pkgs.nodejs-18_x}/bin/node dist/index.js "\$@"
            EOF
            chmod +x $out/bin/hypnosis-audio-platform
          '';
        };
      in hypnosisAudioPlatform;

    port = mkOption {
      type = types.port;
      default = 5000;
      description = "Port to listen on";
    };

    useDatabase = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to use PostgreSQL database";
    };

    databaseUrl = mkOption {
      type = types.str;
      default = "postgresql://hypnosis:hypnosis_password@localhost:5432/hypnosis_db";
      description = "PostgreSQL connection URL";
    };

    sessionSecret = mkOption {
      type = types.str;
      default = "change-me-in-production";
      description = "Secret for session encryption";
    };

    user = mkOption {
      type = types.str;
      default = "hypnosis";
      description = "User to run the service";
    };

    group = mkOption {
      type = types.str;
      default = "hypnosis";
      description = "Group to run the service";
    };

    createDatabase = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to create the PostgreSQL database";
    };

    createSampleData = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to initialize sample data";
    };

    enableNginx = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to configure Nginx as a reverse proxy";
    };

    domain = mkOption {
      type = types.str;
      default = "hypnosis.local";
      description = "Domain name for the Nginx virtual host";
    };
  };

  config = mkIf cfg.enable {
    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      description = "Hypnosis Audio Platform service user";
      createHome = true;
      home = "/var/lib/hypnosis-audio-platform";
    };

    users.groups.${cfg.group} = {};

    # PostgreSQL service if needed
    services.postgresql = mkIf cfg.useDatabase {
      enable = true;
      ensureDatabases = mkIf cfg.createDatabase [ "hypnosis_db" ];
      ensureUsers = mkIf cfg.createDatabase [
        {
          name = "hypnosis";
          ensurePermissions = {
            "DATABASE hypnosis_db" = "ALL PRIVILEGES";
          };
        }
      ];
      authentication = ''
        local hypnosis_db hypnosis trust
        host hypnosis_db hypnosis 127.0.0.1/32 trust
        host hypnosis_db hypnosis ::1/128 trust
      '';
    };

    systemd.services.hypnosis-audio-platform = {
      description = "Hypnosis Audio Platform";
      wantedBy = [ "multi-user.target" ];
      after = mkIf cfg.useDatabase [ "postgresql.service" ];
      requires = mkIf cfg.useDatabase [ "postgresql.service" ];

      environment = {
        NODE_ENV = "production";
        PORT = toString cfg.port;
        USE_DATABASE = toString cfg.useDatabase;
        DATABASE_URL = cfg.databaseUrl;
        SESSION_SECRET = cfg.sessionSecret;
      };

      serviceConfig = {
        User = cfg.user;
        Group = cfg.group;
        ExecStart = "${cfg.package}/bin/hypnosis-audio-platform";
        Restart = "always";
        WorkingDirectory = "/var/lib/hypnosis-audio-platform";
        StateDirectory = "hypnosis-audio-platform";
        StateDirectoryMode = "0750";
      };

      preStart = mkIf (cfg.useDatabase && cfg.createSampleData) ''
        # Run database migrations
        cd ${cfg.package}/lib/hypnosis-audio-platform
        export NODE_ENV=production
        export DATABASE_URL="${cfg.databaseUrl}"
        ${pkgs.nodejs-18_x}/bin/node -e "
          const { spawn } = require('child_process');
          const drizzle = spawn('${pkgs.nodejs-18_x}/bin/npx', ['drizzle-kit', 'push']);
          drizzle.stdout.on('data', (data) => console.log(data.toString()));
          drizzle.stderr.on('data', (data) => console.error(data.toString()));
          drizzle.on('close', (code) => {
            console.log('Drizzle migration completed with code ' + code);
            process.exit(code);
          });
        "

        # Check if users table is empty and create sample data if needed
        USER_COUNT=$(${pkgs.postgresql}/bin/psql -U hypnosis -d hypnosis_db -c \
        "SELECT COUNT(*) FROM users" -t | xargs || echo "0")
        
        if [ "$USER_COUNT" -eq "0" ]; then
          echo "Initializing sample data..."
          ${pkgs.bash}/bin/bash ${cfg.package}/lib/hypnosis-audio-platform/init-db.sh
        fi
      '';
    };

    # Optional: Nginx reverse proxy
    services.nginx = mkIf cfg.enableNginx {
      enable = true;
      virtualHosts.${cfg.domain} = {
        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.port}";
          proxyWebsockets = true;
        };
      };
    };

    # Open firewall port
    networking.firewall.allowedTCPPorts = [ cfg.port ] 
      ++ (if cfg.enableNginx then [ 80 443 ] else []);
  };
}