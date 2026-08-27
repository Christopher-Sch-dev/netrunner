# Gherkin — resume: el recuerdo que se re-adhiere al reconectar

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que al reconectar (jack-in) se cargue todo el estado del deck (snapshot + decisiones open + history + canon pendiente),
**para** que el "virus persista tras Jack-Out" se materialice: la próxima sesión retoma donde quedó, sin re-explorar desde cero.

## Acceptance Criteria
- **AC-1**: `resume(projectDir)` → { snapshot, decisions, history, canonStale }.
- **AC-2**: decisiones open (estado 'open') se cargan desde `.netrunner/decisions/`.
- **AC-3**: history reciente se carga (últimas 20 operaciones).
- **AC-4**: canonStale indica si el canon requiere actualización (señal, no reescritura).
- **AC-5**: sin estado → devuelve vacíos (no falla).

## Escenarios
```
Feature: resume (el recuerdo que se re-adhiere)

  Scenario: reconectar con estado
    Given un proyecto con snapshot + decisiones + history
    When  resume
    Then  devuelve snapshot + decisiones open + history + canonStale

  Scenario: sin estado
    Given un proyecto sin .netrunner
    When  resume
    Then  devuelve vacíos (no falla)
```
