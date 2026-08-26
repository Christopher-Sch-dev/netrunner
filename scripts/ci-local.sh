#!/usr/bin/env bash
# rol: Gate de CI LOCAL de Netrunner (reemplaza GitHub Actions mientras el
# billing de la cuenta está bloqueado — DEC-003). Ejecuta el pipeline COMPLETO
# de calidad: typecheck → lint → test → mutation → actionlint → act.
#
# Uso: ./scripts/ci-local.sh [--fast]   (--fast: salta mutation + act)
# Exit 0 = todo verde. Exit !=0 = bloquea (no dejar mergear a main).
set -euo pipefail

cd "$(dirname "$0")/.."
FAST="${1:-}"
echo "▶▶ NETRUNNER CI LOCAL (equivalente a GitHub Actions ci.yml)"

fail() { echo "✗✗ CI LOCAL FALLÓ en: $1"; exit 1; }

# 1. Typecheck
echo "▶ [1/6] typecheck (tsc --noEmit)"
pnpm typecheck || fail "typecheck"

# 2. Lint
echo "▶ [2/6] lint"
pnpm lint || fail "lint"

# 3. Unit tests
echo "▶ [3/6] test (vitest)"
pnpm test || fail "test"

if [[ "$FAST" == "--fast" ]]; then
  echo "▶ [4/6] SKIPPED (--fast: sin mutation ni act)"
  echo "✓✓ CI LOCAL OK (fast)"
  exit 0
fi

# 4. Mutation testing (timeboxed; incremental: 1ª corrida lenta, siguientes rápidas)
echo "▶ [4/6] mutation (stryker, timeboxed 900s)"
timeout 900 pnpm mutate || fail "mutation"

# 5. actionlint (valida los workflows)
echo "▶ [5/6] actionlint (workflows en scripts/ci-github/)"
actionlint scripts/ci-github/*.yml || fail "actionlint"

# 6. act (corre el workflow ci.yml localmente en Docker)
echo "▶ [6/6] act (corre ci.yml desde scripts/ci-github/ en Docker, job quality-gates)"
act -W scripts/ci-github/ci.yml -j quality-gates --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:act-latest || fail "act"

echo "✓✓ CI LOCAL OK — todos los gates pasaron"
