# Gherkin — install multi-plataforma ampliado

## SPEC (Mandamiento 0)
**Como** un agente que quiere que un proyecto use Netrunner,
**quiero** instalarlo en más plataformas de agentes (copilot, aider, devin, agents genérico),
**para** que el motor quede entendible y controlable por cualquier agente (gap Graphify: registrar skill en 20+ plataformas).

## Acceptance Criteria
- **AC-1**: `install` soporta copilot/aider/devin/agents (además de los 9 existentes).
- **AC-2**: cada target escribe su config MCP + skill dir.
- **AC-3**: idempotente.
- **AC-4**: target inválido → error estructurado.

## Escenarios
```
Feature: install multi-plataforma ampliado

  Scenario: instalar en copilot
    Given un proyecto
    When  install copilot
    Then  escribe config MCP + skill dir

  Scenario: target inválido
    When  install no-existe
    Then  error estructurado
```
