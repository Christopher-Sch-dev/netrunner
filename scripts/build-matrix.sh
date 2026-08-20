#!/usr/bin/env bash
# rol: Compila la matriz de binarios nativos de Netrunner (T5.1).
# Uso: ./scripts/build-matrix.sh [target...]  (default: 4 plataformas base)
# Cross-compile desde cualquier máquina (bun build --compile --target).
set -euo pipefail

cd "$(dirname "$0")/.."

DEFAULT_TARGETS=(
  bun-linux-x64
  bun-linux-x64-baseline
  bun-darwin-arm64
  bun-windows-x64
)
TARGETS=("${@:-${DEFAULT_TARGETS[@]}}")

mkdir -p dist

for target in "${TARGETS[@]}"; do
  echo "▶ build: $target"
  bun build --compile --minify --bytecode \
    --target="$target" \
    ./src/cli.ts \
    --outfile "dist/netrunner-$target"
done

echo "✓ binarios en dist/:"
ls -lh dist/ | grep netrunner
