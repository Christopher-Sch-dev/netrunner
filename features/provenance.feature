# Gherkin — Provenance en output (src/map/index.ts, src/context/queries.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que cada edge del grafo exponga su PROVENANCE (`EXTRACTED`/`INFERRED`/`AMBIGUOUS`)
y el `file:line` de donde salió,
**para** que el LLM pueda auditar cada afirmación y no alucine (provenance).
el gap #1 del estado del arte).

## Acceptance Criteria
- **AC-1**: `map` devuelve edges con `provenance` (EXTRACTED/INFERRED) + `file`/`line` de origen.
- **AC-2**: `explore` devuelve edges con `provenance` + `file`/`line`.
- **AC-3**: PURE/determinista: sin provenance → default `INFERRED` (no rompe).
- **AC-4**: el output es JSON limpio que el LLM lee sin alucinar.

## Escenarios
```
Feature: Provenance en output

  Scenario: map expone provenance + file:line
    Given un grafo indexado con edges EXTRACTED
    When  exportMap(dir)
    Then  cada edge tiene provenance y file/line

  Scenario: explore expone provenance
    When  explore(sym, dir)
    Then  los edges incluyen provenance
```
