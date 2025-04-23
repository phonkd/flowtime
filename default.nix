# default.nix - For compatibility with traditional nix-build
(import (
  fetchTarball {
    url = "https://github.com/edolstra/flake-compat/archive/master.tar.gz";
    sha256 = "0m6nmi1fx0glchyafiaxhagbpd0ck4kw68nb9418sy7vi8xc79rl";
  }
) {
  src = ./.;
}).defaultNix