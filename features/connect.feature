# Gherkin — Conectar rollback restore + snapshot save/load al CLI

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** restaurar un snapshot (`rollback restore <id>`) y guardar/cargar el estado
(`snapshot save`/`snapshot load`),
**para** que todas las capabilities de rollback/snapshot estén accesibles por CLI
(fix auditoría: solo create/list estaban conectados).

## Acceptance Criteria
- **AC-1**: `netrunner rollback restore <id>` restaura el snapshot (re-escribe el estado).
- **AC-2**: `netrunner snapshot save` persiste el snapshot en state/project.json.
- **AC-3**: `netrunner snapshot load` lee el snapshot persistido.
- **AC-4**: PURE/determinista: snapshot no encontrado → error estructurado.

## Escenarios
```
Feature: Conectar rollback restore + snapshot save/load

  Scenario: rollback restore restaura
    Given un snapshot creado
    When  rollback restore <id>
    Then  re-escribe el estado

  Scenario: snapshot save + load roundtrip
    When  snapshot save y snapshot load
    Then  devuelve el mismo snapshot
```
