#!/usr/bin/env bash
# Netrunner installer — downloads the prebuilt binary from GitHub Releases.
# Usage: curl -fsSL https://github.com/Christopher-Sch-dev/netrunner/raw/main/install.sh | sh
set -euo pipefail

REPO="Christopher-Sch-dev/netrunner"
VERSION="${NETRUNNER_VERSION:-v0.3.1}"
BIN_NAME="netrunner"
INSTALL_DIR="${NETRUNNER_INSTALL_DIR:-$HOME/.local/bin}"

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

URL="https://github.com/$REPO/releases/download/$VERSION/${BIN_NAME}-${OS}-${ARCH}"
echo "Downloading Netrunner $VERSION ($OS/$ARCH)…"
mkdir -p "$INSTALL_DIR"
curl -fsSL "$URL" -o "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"

echo "Installed to $INSTALL_DIR/$BIN_NAME"
echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
"$INSTALL_DIR/$BIN_NAME" --version
