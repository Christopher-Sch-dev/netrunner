# Gherkin — _meta + schema version (src/cli.ts emit)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que cada output del CLI incluya un `_meta` con schemaVersion y tool,
**para** que el LLM sepa qué estructura esperar y de dónde viene el output
(validador #4 — schema version + fingerprint).

## Acceptance Criteria
- **AC-1**: `emit(result, human)` agrega `_meta: { schemaVersion, tool }` al output JSON.
- **AC-2**: schemaVersion es estable (ej. '1.0').
- **AC-3**: PURE/determinista: no rompe el output existente (los campos se agregan, no se reemplazan).
- **AC-4**: `--human` no agrega _meta (output legible).

## Escenarios
```
Feature: _meta + schema version

  Scenario: output incluye _meta
    Given un comando que emite JSON
    When  emit(result, false)
    Then  el JSON incluye _meta.schemaVersion y _meta.tool

  Scenario: --human no agrega _meta
    When  emit(result, true)
    Then  no incluye _meta
```
