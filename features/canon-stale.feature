# Gherkin — canonStale: detector de canon desactualizado (canon-vivo señal)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** saber si el canon de documentación (README.generated.md) está desactualizado respecto al estado del proyecto,
**para** que se emita una SEÑAL al agente (no auto-reescritura — observación de Cris: el agente edita las secciones marcadas, preservando reglas generales).

## Acceptance Criteria
- **AC-1**: `canonStale(projectDir)` → true si el proyecto cambió (snapshot mtime > README.generated.md mtime).
- **AC-2**: si no hay README.generated.md → true (canon no existe → stale).
- **AC-3**: idempotente/determinista (PURE).
- **AC-4**: `status` expone `canonStale` + cuántas secciones requieren actualización.

## Escenarios
```
Feature: canonStale (canon-vivo señal)

  Scenario: canon desactualizado
    Given un proyecto con README.generated.md viejo (mtime < snapshot)
    When  canonStale
    Then  true

  Scenario: canon al día
    Given README.generated.md más nuevo que el proyecto
    When  canonStale
    Then  false

  Scenario: sin canon
    Given un proyecto sin README.generated.md
    When  canonStale
    Then  true
```
