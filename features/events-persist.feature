# Gherkin — eventos durables persistidos (invariant dsh "model-visible ⟺ logged")

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que cada operación emita un evento durable PERSISTIDO en disco,
**para** que el agente pueda *replay* qué pasó (invariant dsh "model-visible ⟺ logged") — no solo ver el último resultado.

## Acceptance Criteria
- **AC-1**: `emitEvent(projectDir, event)` persiste a `.netrunner/events.log` (append-only).
- **AC-2**: `replayEvents(projectDir)` devuelve los eventos en orden.
- **AC-3**: `ops` emite op/start + op/result (o op/error).
- **AC-4**: sin log → [] (no falla).

## Escenarios
```
Feature: eventos durables persistidos

  Scenario: op emite eventos
    Given un proyecto
    When  ops test
    Then  events.log tiene op/start + op/result

  Scenario: replay
    When  replayEvents
    Then  devuelve los eventos en orden

  Scenario: sin log
    Given un proyecto sin events.log
    When  replayEvents
    Then  []
```
