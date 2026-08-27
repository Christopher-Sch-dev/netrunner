# Gherkin — Daemon persistente (src/daemon/index.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** un daemon persistente que vigile el proyecto y auto-sincronice el grafo,
**para** que el grafo se mantenga al día sin invocar `init` manualmente (el "curator
fantasma" de Rache Bartmoss — Jueces 1,2,3).

## Acceptance Criteria
- **AC-1**: `daemonTick(projectDir)` corre una pasada: syncIfNeeded + lint + curator.
- **AC-2**: devuelve { synced, issues, actions } (señal externa real).
- **AC-3**: PURE/determinista: sin cambios → synced false, sin issues, sin acciones.
- **AC-4**: idempotente (correr dos veces seguidas da el mismo resultado si no cambió nada).

## Escenarios
```
Feature: Daemon persistente

  Scenario: sin cambios → no-op
    Given un proyecto indexado y sin cambios
    When  daemonTick(dir)
    Then  { synced: false, issues: [], actions: [] }

  Scenario: con cambios → sync + lint + curator
    Given un proyecto con un archivo modificado
    When  daemonTick(dir)
    Then  synced true (re-indexa)
```
