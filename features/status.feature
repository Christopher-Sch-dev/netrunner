# Gherkin — CLI status (netrunner status)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** ejecutar `netrunner status` para ver el snapshot del proyecto (rama,
versiones, cobertura, servicios, pendientes) y regenerar la doc viva,
**para** que el agente tenga el "sticky note" vivo del proyecto en una llamada
(la feature de status: documentación forzada + contexto completo).

## Acceptance Criteria
- **AC-1**: `netrunner status` devuelve el snapshot del proyecto (git/versions/coverage/services/dirs/todos) en JSON.
- **AC-2**: `netrunner status --docs` además regenera README.generated.md + AGENTS.md.
- **AC-3**: output TOON (JSON mínimo, sin verbosidad).
- **AC-4**: exit 0 con snapshot válido.

## Escenarios
```
Feature: CLI status

  Scenario: status devuelve el snapshot
    Given un proyecto con git + package.json
    When  ejecuto "netrunner status"
    Then  devuelvo JSON con git.branch y versions

  Scenario: status --docs regenera la doc
    When  ejecuto "netrunner status --docs"
    Then  además escribo README.generated.md
```
