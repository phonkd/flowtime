# Nix expression to install Hypnosis Audio Platform as a system package
# You can install this with: nix-env -i -f install-as-package.nix

let
  # Use specific revision for reproducibility
  pkgsSrc = builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/refs/tags/23.11.tar.gz";
    sha256 = "1ndiv385w1qyb3b18vw13991fzb9wg4cl21wglk89grsfsnra41k";
  };
  
  # Import nixpkgs with system-specific settings
  pkgs = import pkgsSrc {
    system = builtins.currentSystem;
    config = {};
    overlays = [];
  };
  
  # Fetch the Hypnosis Audio Platform source
  hypnosisSrc = pkgs.fetchFromGitHub {
    owner = "yourusername"; # Replace with actual username
    repo = "hypnosis-audio-platform";
    rev = "main"; # Or specify a tag/commit
    sha256 = "sha256-0000000000000000000000000000000000000000000000000000"; # Replace with actual hash
  };
  
  # Build the application
  hypnosisApp = pkgs.stdenv.mkDerivation {
    pname = "hypnosis-audio-platform";
    version = "1.0.0";
    src = hypnosisSrc;
    
    buildInputs = with pkgs; [
      nodejs-18_x
      nodePackages.typescript
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
      cp -r node_modules $out/lib/hypnosis-audio-platform/
      cp -r package.json $out/lib/hypnosis-audio-platform/
      cp -r public $out/lib/hypnosis-audio-platform/
      
      cat > $out/bin/hypnosis-audio-platform <<EOF
      #!/usr/bin/env bash
      export NODE_ENV=production
      cd $out/lib/hypnosis-audio-platform
      exec ${pkgs.nodejs-18_x}/bin/node dist/index.js "\$@"
      EOF
      
      chmod +x $out/bin/hypnosis-audio-platform
    '';
  };
in hypnosisApp

# Usage:
# 1. Install the package: nix-env -i -f install-as-package.nix
# 2. Run the application: hypnosis-audio-platform
#
# Or run without installing:
# nix-shell -p $(nix-build install-as-package.nix) --run hypnosis-audio-platform