# Gherkin — daemon-watch: daemon residente con intervalos

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que el daemon corra en bucle con intervalos (residente, no one-shot),
**para** que el "curator fantasma" de Rache Bartmoss vigile el proyecto continuamente y auto-mejore mientras el agente trabaja.

## Acceptance Criteria
- **AC-1**: `daemonWatch(projectDir, {intervalMs, maxTicks})` corre daemonTick en bucle.
- **AC-2**: corre hasta maxTicks (testable) o infinito (CLI --watch).
- **AC-3**: devuelve los resultados de cada tick.
- **AC-4**: idempotente (cada tick es una pasada independiente).

## Escenarios
```
Feature: daemon-watch (residente)

  Scenario: corre N ticks
    Given un proyecto
    When  daemonWatch con maxTicks=2
    Then  devuelve 2 resultados

  Scenario: cada tick es independiente
    When  daemonWatch
    Then  cada resultado tiene synced/issues/actions
```
