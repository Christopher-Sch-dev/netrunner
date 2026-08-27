# Gherkin — gitignore: respetar el .gitignore del proyecto

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el grafo respete el .gitignore del proyecto (no indexar lo ignorado),
**para** que NetRunner no abstraiga node_modules, vendor/, generated/ ni otros dirs que el proyecto ignora (gap señalado por Cris + comparación con Graphify).

## Acceptance Criteria
- **AC-1**: `loadGitignore(projectDir)` → lista de patrones del .gitignore.
- **AC-2**: `isIgnored(path, patterns)` → true si el path matchea un patrón.
- **AC-3**: el grafo usa loadGitignore + isIgnored (no solo la lista hardcodeada).
- **AC-4**: sin .gitignore → lista vacía (usa la hardcodeada).

## Escenarios
```
Feature: gitignore (respetar el .gitignore del proyecto)

  Scenario: proyecto ignora vendor/
    Given un proyecto con .gitignore que ignora vendor/
    When  indexProject
    Then  vendor/ NO se indexa

  Scenario: sin .gitignore
    Given un proyecto sin .gitignore
    When  indexProject
    Then  usa la lista hardcodeada (node_modules, .git, etc.)
```
