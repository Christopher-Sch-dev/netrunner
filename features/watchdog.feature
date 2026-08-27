# Gherkin — watchdog: vigilar cambios y notificar

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que un watchdog vigile los cambios del proyecto y emita señales cuando algo cambia,
**para** que la memoria viva se mantenga (el agente se entera de cambios sin consultar — gap señalado por Cris: "necesidades para que la herramienta funcione siempre se actualice").

## Acceptance Criteria
- **AC-1**: `watchdogCheck(projectDir)` → detecta cambios desde el último check (mtime de archivos).
- **AC-2**: si hay cambios → emite señal `cambio` (via hooks).
- **AC-3**: sin cambios → no emite señal.
- **AC-4**: determinista.

## Escenarios
```
Feature: watchdog (vigilar cambios)

  Scenario: hay cambios
    Given un proyecto con un archivo modificado
    When  watchdogCheck
    Then  emite señal 'cambio'

  Scenario: sin cambios
    Given un proyecto sin cambios
    When  watchdogCheck
    Then  no emite señal
```
