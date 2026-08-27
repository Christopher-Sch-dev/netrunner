# Gherkin — Evento durable + waterfall (src/context/events.ts, src/core/registry.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que cada operación emita un evento durable reconstruible y que el registry
tenga hooks pre/post-ejecución,
**para** que el agente pueda *replay* qué pasó (invariante "model-visible ⟺ logged")
y que policy/telemetry/guard sean seams intercambiables (Juez 2).

## Acceptance Criteria
- **AC-1**: `emitEvent(log, event)` agrega un evento durable (op/start, op/result, op/error).
- **AC-2**: `replayEvents(log)` devuelve los eventos en orden.
- **AC-3**: `ToolRegistry` tiene hooks `pre-execute`/`post-execute` (waterfall con next()).
- **AC-4**: PURE/determinista: log vacío → []; hooks no rompen la ejecución normal.

## Escenarios
```
Feature: Evento durable + waterfall

  Scenario: emite y replay eventos
    Given un log
    When  emitEvent(log, {type:'op/start'}) y emitEvent(log, {type:'op/result'})
    Then  replayEvents(log) devuelve ambos en orden

  Scenario: hooks pre/post no rompen la ejecución
    Given un registry con pre/post hooks
    When  call una tool
    Then  ejecuta normal y los hooks corren
```
