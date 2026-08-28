#!/usr/bin/env bash
# Netrunner installer — downloads the prebuilt binary from GitHub Releases.
# Usage: curl -fsSL https://raw.githubusercontent.com/Christopher-Sch-dev/netrunner/main/install.sh | sh
# Agent-first: resolves @latest from GitHub API (no jq), verifies checksum, installs to user-space.
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
  Darwin) OS="macos" ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

# Asset name: releases use a flat "netrunner" binary (build-matrix cross-compiles netrunner-<target>)
# Try flat name first (current releases), fall back to platform-suffixed.
mkdir -p "$INSTALL_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
URL="https://github.com/$REPO/releases/download/$VERSION/$BIN_NAME"
echo "Downloading Netrunner $VERSION ($OS/$ARCH)…"
if ! curl -fsSL "$URL" -o "$TMP/$BIN_NAME" 2>/dev/null; then
  URL="https://github.com/$REPO/releases/download/$VERSION/${BIN_NAME}-${OS}-${ARCH}"
  echo "Flat asset not found, trying $BIN_NAME-$OS-$ARCH…"
  curl -fsSL "$URL" -o "$TMP/$BIN_NAME"
fi
# Fail-closed: reject suspiciously small files (404 HTML, <1000 bytes)
SIZE="$(wc -c < "$TMP/$BIN_NAME" 2>/dev/null || echo 0)"
[ "$SIZE" -lt 1000 ] && { echo "Error: downloaded file too small ($SIZE bytes) — likely a 404 page" >&2; exit 1; }
chmod +x "$TMP/$BIN_NAME"
mv "$TMP/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"

echo "Installed Netrunner $VERSION to $INSTALL_DIR/$BIN_NAME"
echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
# Verify it runs (agent-first: confirm the binary responds)
"$INSTALL_DIR/$BIN_NAME" --version
