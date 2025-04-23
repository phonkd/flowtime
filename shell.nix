# shell.nix - For traditional nix-shell usage
with import <nixpkgs> {};

mkShell {
  buildInputs = [
    nodejs-18_x
    nodePackages.typescript
    postgresql_14
  ];

  shellHook = ''
    echo "Hypnosis Audio Platform development environment"
    echo "Node.js: $(node --version)"
    echo "PostgreSQL: $(psql --version)"
  '';
}