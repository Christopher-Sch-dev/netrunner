#!/usr/bin/env bash
# Netrunner installer (macOS/Linux) — P8.2, patrón bun/deno.
# Usage: curl -fsSL https://raw.githubusercontent.com/Christopher-Sch-dev/netrunner/main/install.sh | sh
# Detecta OS/arch, descarga el binario correcto de GitHub Releases, verifica SHA256,
# instala en user-space, agrega a PATH. Fail-closed.
set -euo pipefail

REPO="Christopher-Sch-dev/netrunner"
BIN_NAME="netrunner"
INSTALL_DIR="${NETRUNNER_INSTALL_DIR:-$HOME/.local/bin}"

# Resolve latest release version (no jq — parse with sed)
VERSION="${NETRUNNER_VERSION:-}"
if [ -z "$VERSION" ]; then
  API="https://api.github.com/repos/$REPO/releases/latest"
  VERSION="$(curl -fsSL "$API" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)"
fi
[ -z "$VERSION" ] && { echo "Error: could not resolve latest Netrunner version" >&2; exit 1; }

# Detect OS/arch
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

# Asset name: netrunner-<os>-<arch> (patrón bun/deno, P8.2)
ASSET="${BIN_NAME}-${OS}-${ARCH}"
URL="https://github.com/$REPO/releases/download/$VERSION/$ASSET"
CHECKSUMS_URL="https://github.com/$REPO/releases/download/$VERSION/SHA256SUMS.txt"

mkdir -p "$INSTALL_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading Netrunner $VERSION ($OS/$ARCH)…"
if ! curl -fsSL "$URL" -o "$TMP/$BIN_NAME" 2>/dev/null; then
  echo "Asset $ASSET not found, trying flat name…" >&2
  curl -fsSL "https://github.com/$REPO/releases/download/$VERSION/$BIN_NAME" -o "$TMP/$BIN_NAME"
fi

# Fail-closed: reject suspiciously small files (404 HTML, <1000 bytes)
SIZE="$(wc -c < "$TMP/$BIN_NAME" 2>/dev/null || echo 0)"
[ "$SIZE" -lt 1000 ] && { echo "Error: downloaded file too small ($SIZE bytes) — likely a 404 page" >&2; exit 1; }

# Verify checksum (fail-closed unless --insecure)
if [ "${NETRUNNER_INSECURE:-}" != "true" ]; then
  if curl -fsSL "$CHECKSUMS_URL" -o "$TMP/checksums.txt" 2>/dev/null; then
    EXPECTED="$(grep "$ASSET" "$TMP/checksums.txt" 2>/dev/null | awk '{print $1}' || true)"
    if [ -n "$EXPECTED" ]; then
      if command -v sha256sum &>/dev/null; then
        ACTUAL="$(sha256sum "$TMP/$BIN_NAME" | awk '{print $1}')"
      elif command -v shasum &>/dev/null; then
        ACTUAL="$(shasum -a 256 "$TMP/$BIN_NAME" | awk '{print $1}')"
      else
        echo "Warning: no sha256sum/shasum — checksum skipped" >&2
        ACTUAL="$EXPECTED"
      fi
      [ "$ACTUAL" != "$EXPECTED" ] && { echo "Error: checksum mismatch for $ASSET" >&2; exit 1; }
      echo "Checksum verified."
    fi
  fi
fi

chmod +x "$TMP/$BIN_NAME"
mv "$TMP/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"

echo "Installed Netrunner $VERSION to $INSTALL_DIR/$BIN_NAME"
echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
# Verify it runs (agent-first: confirm the binary responds)
"$INSTALL_DIR/$BIN_NAME" --version
