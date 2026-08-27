# Gherkin — hooks: señal al agente conectado

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que cada operación emita una señal al agente conectado (canon pendiente, cambios, errores),
**para** que el agente sepa proactivamente si necesita actualizar documentación o hacer algo (gap señalado por Cris: "mandar información a la gente con el que está conectado").

## Acceptance Criteria
- **AC-1**: `emitSignal(projectDir, signal)` persiste una señal en `.netrunner/signals.log`.
- **AC-2**: `pendingSignals(projectDir)` → señales no leídas.
- **AC-3**: `markSignalsRead(projectDir)` → marca como leídas.
- **AC-4**: sin señales → [] (no falla).

## Escenarios
```
Feature: hooks (señal al agente conectado)

  Scenario: emite señal
    Given un proyecto
    When  emitSignal canon-pendiente
    Then  la señal queda en signals.log

  Scenario: señales pendientes
    When  pendingSignals
    Then  devuelve las no leídas

  Scenario: marcar leídas
    When  markSignalsRead
    Then  pendingSignals → []
```
