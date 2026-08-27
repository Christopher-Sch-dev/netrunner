# Gherkin — Gate de validación del curator (src/auto/gate.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que el curator acepte un Memento-Skill SOLO si tiene señal externa clara,
**para** que un Memento malo no se propague (riesgo #1 del Juez 2 — validation gate:
el caso ungated cayó de 55.4%→2.6%).

## Acceptance Criteria
- **AC-1**: `shouldUpsert(observation)` devuelve true solo si `ok && veces >= umbral`.
- **AC-2**: `shouldUpsert` con `ok=false` → false (nunca upsertea un fallo).
- **AC-3**: `shouldUpsert` con `veces < umbral` → false (señal insuficiente).
- **AC-4**: PURE/determinista: umbral default (ej. 3) si no se pasa.

## Escenarios
```
Feature: Gate de validación del curator

  Scenario: señal clara → upsert
    Given ok=true, veces=5
    When  shouldUpsert(obs)
    Then  true

  Scenario: fallo → no upsert
    Given ok=false
    Then  false

  Scenario: señal insuficiente → no upsert
    Given ok=true, veces=1
    Then  false
```
