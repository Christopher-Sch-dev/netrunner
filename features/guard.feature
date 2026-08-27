# Gherkin — guard (Black ICE: protecciones del repo) (src/guard/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el motor verifique protecciones del repo (no commitear secrets, no tocar archivos protegidos),
**para** que el proyecto esté protegido del agente (el Black ICE de la mina cyberpunk #3).

## Acceptance Criteria
- **AC-1**: `guardCheck(projectDir)` devuelve { ok, issues: [{ file, reason }] }.
- **AC-2**: detecta secrets (patrones ghp_/sk-/token=) en archivos del proyecto.
- **AC-3**: detecta archivos protegidos (`.env`, `.pem`, `.key`) que no deberían commitearse.
- **AC-4**: PURE/determinista: sin issues → { ok: true, issues: [] }.

## Escenarios
```
Feature: guard (Black ICE)

  Scenario: detecta un secret en un archivo
    Given un archivo con "ghp_xxx"
    When  guardCheck(dir)
    Then  issues incluye { file, reason: contiene 'secret' }

  Scenario: sin issues
    Then  { ok: true, issues: [] }
```
