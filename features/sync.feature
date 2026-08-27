# Gherkin — Auto-sync del grafo (src/context/sync.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el grafo se refresque SOLO cuando cambian los archivos,
**para** que el agente no tenga que correr `netrunner init` manualmente (uso continuo,
la lección de Ponytail — "no index, no value", robar de codegraph).

## Acceptance Criteria
- **AC-1**: `needsSync(projectDir)` devuelve true si algún archivo fuente cambió desde el último index.
- **AC-2**: `syncIfNeeded(projectDir)` re-indexa solo si `needsSync` es true (idempotente).
- **AC-3**: PURE/determinista: sin index.db → needsSync true (hay que indexar).
- **AC-4**: compara mtime de archivos fuente vs el mtime del index.db.

## Escenarios
```
Feature: Auto-sync del grafo

  Scenario: sin index.db → needsSync true
    Given un proyecto sin .netrunner/index.db
    When  needsSync(dir)
    Then  true (hay que indexar)

  Scenario: archivo cambió → needsSync true
    Given un proyecto indexado
    When  modifico un archivo fuente
    Then  needsSync(dir) es true

  Scenario: sin cambios → needsSync false
    Then  needsSync(dir) es false
```
