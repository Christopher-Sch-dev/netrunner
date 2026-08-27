# Gherkin — net sleeve: el deck portable

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** exportar el deck (snapshot + decisiones + history + canon) como un Construct portable,
**para** que el agente pueda llevar el estado del deck a otro proyecto (el "sleeve" que se re-adhiere).

## Acceptance Criteria
- **AC-1**: `exportSleeve(projectDir)` → { snapshot, decisions, history, canon } (serializable).
- **AC-2**: `importSleeve(projectDir, sleeve)` → restaura el estado en otro proyecto.
- **AC-3**: sin estado → sleeve vacío (no falla).
- **AC-4**: determinista.

## Escenarios
```
Feature: net sleeve (deck portable)

  Scenario: exporta el deck
    Given un proyecto con estado
    When  exportSleeve
    Then  devuelve snapshot + decisions + history + canon

  Scenario: importa el deck
    Given un sleeve exportado
    When  importSleeve en otro proyecto
    Then  restaura el estado

  Scenario: sin estado
    Given un proyecto sin .netrunner
    When  exportSleeve
    Then  sleeve vacío (no falla)
```
