# GitHub Actions — Workflows (desactivados temporalmente)

> **Estado: DESACTIVADOS.** GitHub no descubre workflows fuera de `.github/workflows/`.
> El gate de calidad actual es el **CI local** (`scripts/ci-local.sh` + git hooks pre-commit/pre-push).

## Por qué están acá

GitHub Actions remoto está **bloqueado por un problema de billing** de la cuenta
(no del repo). Para no perder tiempo esperando runs que GitHub no ejecuta, los
workflows viven acá (versionados) y el enforcement real es local.

## Cómo restaurarlos

Cuando el billing se resuelva, volver a `.github/workflows/`:

```bash
mkdir -p .github/workflows
git mv scripts/ci-github/ci.yml .github/workflows/ci.yml
git mv scripts/ci-github/release.yml .github/workflows/release.yml
git push origin develop
```

GitHub los auto-descubre y vuelven a correr en cada push/PR.

## Contenido

- `ci.yml` — quality gates (typecheck → lint → test → mutation) en PR/push a main/develop.
- `release.yml` — build de binarios (matriz) + release al mergear release/* a main.

## Alternativa: CI local (activo)

`./scripts/ci-local.sh` ejecuta el MISMO pipeline que `ci.yml`, pero 100% local
con `act` (nektos) en Docker — sin depender de GitHub Actions.
