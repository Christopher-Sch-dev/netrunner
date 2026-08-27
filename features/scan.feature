# Gherkin — scan (overlay de info del proyecto) (src/scan/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** un resumen "overlay" del proyecto (stack, git, versiones, cobertura, servicios, pendientes) en una llamada,
**para** que el agente "mire" el repo y proyecte una capa de datos útiles (la Smartlink/Kiroshi de la mina cyberpunk #23).

## Acceptance Criteria
- **AC-1**: `scanProject(projectDir)` devuelve un resumen unificado: stack + git + versions + coverage + services + todos.
- **AC-2**: PURE/determinista: sin datos → defaults (no falla).
- **AC-3**: output TOON (JSON mínimo, sin verbosidad).
- **AC-4**: reutiliza los detectores existentes (no duplica lógica).

## Escenarios
```
Feature: scan (overlay de info)

  Scenario: scan unifica los detectores
    Given un proyecto con git + package.json
    When  scanProject(dir)
    Then  incluye stack, git.branch, versions, coverage, services, todos

  Scenario: sin datos
    Then  devuelve defaults (no falla)
```
