#!/usr/bin/env bash
# rol: Compila la matriz de binarios nativos de NetRunner (P8.2, cross-platform).
# Uso: ./scripts/build-matrix.sh [target...]  (default: 4 plataformas base)
# Cross-compile desde cualquier máquina (bun build --compile --target).
# Naming: netrunner-<os>-<arch> (patrón bun/deno) — el install.sh/install.ps1
# descargan el asset correcto por SO/arch. bun-linux-x64-baseline es redundante
# (doc oficial bun: solo x64/arm64 por OS) — se omite.
set -euo pipefail

cd "$(dirname "$0")/.."

DEFAULT_TARGETS=(
  bun-linux-x64
  bun-linux-arm64
  bun-darwin-x64
  bun-darwin-arm64
  bun-windows-x64
)
TARGETS=("${@:-${DEFAULT_TARGETS[@]}}")

mkdir -p dist

for target in "${TARGETS[@]}"; do
  # mapea bun target → nombre de asset netrunner-<os>-<arch>
  case "$target" in
    bun-linux-x64)   asset="netrunner-linux-x64" ;;
    bun-linux-arm64) asset="netrunner-linux-arm64" ;;
    bun-darwin-x64)  asset="netrunner-darwin-x64" ;;
    bun-darwin-arm64) asset="netrunner-darwin-arm64" ;;
    bun-windows-x64) asset="netrunner-windows-x64.exe" ;;
    *) asset="netrunner-$target" ;;
  esac
  echo "▶ build: $target → $asset"
  bun build --compile --minify --bytecode \
    --target="$target" \
    ./src/cli.ts \
    --outfile "dist/$asset"
done

echo "✓ binarios en dist/:"
ls -lh dist/ | grep netrunner
