# default.nix - For compatibility with traditional nix-build
with import <nixpkgs> {};

stdenv.mkDerivation {
  pname = "hypnosis-audio-platform";
  version = "1.0.0";
  src = ./.;

  buildInputs = [
    nodejs-18_x
    nodePackages.typescript
    postgresql_14
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
    exec ${nodejs-18_x}/bin/node dist/index.js "\$@"
    EOF
    chmod +x $out/bin/hypnosis-audio-platform
  '';

  meta = with lib; {
    description = "Hypnosis Audio Platform";
    license = licenses.mit;
    platforms = platforms.unix;
  };
}