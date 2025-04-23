{
  description = "Hypnosis Audio Platform - A web app for meditation and hypnosis audio content";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodeVersion = pkgs.nodejs-18_x;
        hypnosisAudioPlatform = pkgs.stdenv.mkDerivation {
          pname = "hypnosis-audio-platform";
          version = "1.0.0";
          src = ./.;

          buildInputs = [
            nodeVersion
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

            # Create a wrapper script
            cat > $out/bin/hypnosis-audio-platform <<EOF
            #!/usr/bin/env bash
            export NODE_ENV=production
            cd $out/lib/hypnosis-audio-platform
            exec ${nodeVersion}/bin/node dist/index.js "\$@"
            EOF
            chmod +x $out/bin/hypnosis-audio-platform
          '';

          meta = with pkgs.lib; {
            description = "Hypnosis Audio Platform";
            license = licenses.mit;
            platforms = platforms.unix;
          };
        };
      in
      {
        packages = {
          default = hypnosisAudioPlatform;
          hypnosisAudioPlatform = hypnosisAudioPlatform;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodeVersion
            pkgs.nodePackages.typescript
            pkgs.postgresql_14
          ];

          shellHook = ''
            echo "Hypnosis Audio Platform development environment"
            echo "Node.js: $(node --version)"
            echo "PostgreSQL: $(psql --version)"
          '';
        };

        apps.default = {
          type = "app";
          program = "${hypnosisAudioPlatform}/bin/hypnosis-audio-platform";
        };
      }
    ) // {
      # NixOS module for easy deployment
      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let
          cfg = config.services.hypnosisAudioPlatform;
        in
        {
          options.services.hypnosisAudioPlatform = {
            enable = mkEnableOption "Hypnosis Audio Platform";

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
                ExecStart = "${self.packages.${pkgs.system}.hypnosisAudioPlatform}/bin/hypnosis-audio-platform";
                Restart = "always";
                WorkingDirectory = "/var/lib/hypnosis-audio-platform";
              };

              preStart = mkIf (cfg.useDatabase && cfg.createSampleData) ''
                # Create sample data if user table is empty
                USER_COUNT=$(${pkgs.postgresql}/bin/psql -U hypnosis -d hypnosis_db -c \
                "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'users'" -t | xargs)
                
                if [ "$USER_COUNT" -eq 0 ]; then
                  echo "Initializing database schema and sample data..."
                  ${pkgs.postgresql}/bin/psql -U hypnosis -d hypnosis_db -f ${self.packages.${pkgs.system}.hypnosisAudioPlatform}/lib/hypnosis-audio-platform/init-db.sql
                fi
              '';
            };

            # Optional: Nginx reverse proxy
            services.nginx = {
              enable = true;
              virtualHosts."hypnosis.local" = {
                locations."/" = {
                  proxyPass = "http://127.0.0.1:${toString cfg.port}";
                  proxyWebsockets = true;
                };
              };
            };

            # Open firewall port
            networking.firewall.allowedTCPPorts = [ cfg.port 80 443 ];
          };
        };
    };
}