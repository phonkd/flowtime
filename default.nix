# default.nix - For compatibility with traditional nix-build
(import (
  fetchTarball {
    url = "https://github.com/edolstra/flake-compat/archive/master.tar.gz";
    sha256 = "19d2z6xsvpxm184m41qrpi1bplilwipgnzv9jy17fgw421785q1m";
  }
) {
  src = ./.;
}).defaultNix