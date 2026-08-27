# Gherkin — Agent Plugin generator (src/plugin/generate.ts)

## SPEC (Mandamiento 0)
**Como** un cliente que quiere que su proyecto sea operable por CUALQUIER agente,
**quiero** que `netrunner plugin` genere un **Agent Plugin 1.0.0** (plugin.json + skills/ + mcp.json),
**para** que el proyecto se distribuya empaquetado "build once, run anywhere" (ChatGPT, Codex, Cursor, Copilot).

## Acceptance Criteria (skill agent-plugin-builder: el plugin es el empaque que vende)
- **AC-1**: genera `plugin.json` con `$schema` de agent-plugins.org 1.0.0 + name/version.
- **AC-2**: genera `skills/netrunner/SKILL.md` (playbook del contrato).
- **AC-3**: genera `mcp.json` (wiring `netrunner --mcp`).
- **AC-4**: idempotente (re-generar no duplica).

## Escenarios
```
Feature: Agent Plugin generator

  Scenario: genera plugin.json válido Agent Plugins 1.0.0
    Given dir
    When  generatePlugin("demo", "1.0.0", dir)
    Then  escribo .netrunner/plugin/plugin.json con $schema 1.0.0 y name
    And   escribo skills/netrunner/SKILL.md
    And   escribo mcp.json

  Scenario: idempotente
    When  genero dos veces
    Then  no duplica
```
