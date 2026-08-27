# Gherkin — snapshot rollback (src/rollback/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** hacer backup del estado del proyecto (snapshot) y poder restaurarlo,
**para** que antes de un cambio riesgoso el agente pueda volver atrás (el "snapshot"
de la mina cyberpunk #19).

## Acceptance Criteria
- **AC-1**: `createSnapshot(projectDir)` guarda el estado del proyecto en `.netrunner/backups/<ts>.json`.
- **AC-2**: `listSnapshots(projectDir)` lista los backups disponibles.
- **AC-3**: `restoreSnapshot(projectDir, id)` restaura el snapshot (re-escribe el estado).
- **AC-4**: PURE/determinista: sin backups → { snapshots: [] } (no falla).

## Escenarios
```
Feature: snapshot rollback

  Scenario: crea y lista un snapshot
    Given un proyecto
    When  createSnapshot(dir) y listSnapshots(dir)
    Then  listSnapshots incluye el snapshot creado

  Scenario: restaura un snapshot
    When  restoreSnapshot(dir, id)
    Then  re-escribe el estado del proyecto
```
