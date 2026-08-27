#!/usr/bin/env bash
# rol: Gate de CI LOCAL de Netrunner (reemplaza GitHub Actions mientras el
# billing de la cuenta está bloqueado — DEC-003).
#
# POR DEFECTO: corre SOLO gates rápidos (typecheck + lint + test) — ~2s, no
# revienta la PC aunque corran otros proyectos (OOM fix 2026-08-26).
# Con --full: agrega mutation testing + actionlint + act (pesado, a demanda).
#
# Uso: ./scripts/ci-local.sh          → rápido (default)
#      ./scripts/ci-local.sh --full   → completo (mutation + act)
#      ./scripts/ci-local.sh --fast   → alias de default (rápido)
# Exit 0 = verde. Exit !=0 = bloquea.
set -euo pipefail

cd "$(dirname "$0")/.."
MODE="${1:-fast}"
echo "▶▶ NETRUNNER CI LOCAL ($MODE)"

fail() { echo "✗✗ CI LOCAL FALLÓ en: $1"; exit 1; }

# 1. Typecheck
echo "▶ [1/3] typecheck (tsc --noEmit)"
pnpm typecheck || fail "typecheck"

# 2. Lint
echo "▶ [2/3] lint"
pnpm lint || fail "lint"

# 3. Unit tests
echo "▶ [3/3] test (vitest, maxWorkers 4)"
pnpm test || fail "test"

if [[ "$MODE" != "--full" ]]; then
  echo "✓✓ CI LOCAL OK (rápido). mutation+act: ./scripts/ci-local.sh --full (release)"
  exit 0
fi

# --full: gates pesados, bajo demanda (release/merge, no en cada push)
# 4. Mutation testing (timeboxed; incremental acelera re-corridas)
echo "▶ [4/6] mutation (stryker, concurrency 2, timeboxed 900s)"
timeout 900 pnpm mutate || fail "mutation"

# 5. actionlint (valida los workflows)
echo "▶ [5/6] actionlint (workflows en scripts/ci-github/)"
actionlint scripts/ci-github/*.yml || fail "actionlint"

# 6. act (corre el workflow ci.yml localmente en Docker)
echo "▶ [6/6] act (corre ci.yml desde scripts/ci-github/ en Docker, job quality-gates)"
act -W scripts/ci-github/ci.yml -j quality-gates --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:act-latest || fail "act"

echo "✓✓ CI LOCAL OK (full — todos los gates pasaron)"
