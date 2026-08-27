# Gherkin — Conectores de dominio como plugins (src/plugin/connector.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que los conectores de dominio (DB, cloud, SaaS) se registren como plugins,
**para** que Netrunner sea el orquestador de todos los MCP servers, no un competidor
(Juez 1 — el contrato único proyecta N vistas, los conectores se agregan como toolsets).

## Acceptance Criteria
- **AC-1**: `registerConnector(registry, connector)` registra las tools del conector.
- **AC-2**: un conector declara { id, tools: ToolSpec[] }.
- **AC-3**: PURE/determinista: sin conectores → registry intacto.
- **AC-4**: idempotente (registrar el mismo conector dos veces → error de duplicado).

## Escenarios
```
Feature: Conectores de dominio como plugins

  Scenario: registra un conector
    Given un conector con 1 tool
    When  registerConnector(registry, connector)
    Then  la tool aparece en el registry

  Scenario: duplicado → error
    When  registerConnector dos veces
    Then  lanza error de duplicado
```
