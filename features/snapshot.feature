# Gherkin — Snapshot store (src/context/snapshot.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** un SNAPSHOT del estado del proyecto (rama, versiones, cobertura, servicios,
árbol, pendientes) persistido en `.netrunner/state/project.json`,
**para** que la skill auto-generante lea un "sticky note" vivo y progresivo del proyecto
(la feature de snapshot: "sticky notes para siempre y progresivo").

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `buildSnapshot(projectDir)` une los detectores (git, versions, coverage, services, dirs, todos) en un ProjectSnapshot.
- **AC-2**: `saveSnapshot(projectDir, snapshot)` persiste en `.netrunner/state/project.json`.
- **AC-3**: `loadSnapshot(projectDir)` lee el snapshot persistido (o null si no existe).
- **AC-4**: PURE/determinista: snapshot con mtime (para incremental).

## Escenarios
```
Feature: Snapshot store

  Scenario: buildSnapshot une los detectores
    Given un proyecto con git + package.json
    When  buildSnapshot(dir)
    Then  incluye branch, versions, coverage, services, dirs, todos

  Scenario: save + load roundtrip
    When  saveSnapshot(dir, snap) y loadSnapshot(dir)
    Then  devuelve el mismo snapshot
```
