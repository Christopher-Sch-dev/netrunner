# Gherkin — MCP resources (net://meta/*) (src/transport/mcp-resources.ts)

## SPEC (Mandamiento 0)
**Como** un agente conectado por MCP a un proyecto Netrunner,
**quiero** leer el snapshot del proyecto como RECURSOS MCP (`net://meta/*`),
**para** que el agente obtenga el contexto del proyecto (rama/versiones/cobertura)
sin llamar tools (spec MCP 2026-07-28, la skill auto-generante expuesta al agente).

## Acceptance Criteria
- **AC-1**: `registerMetaResources(server, projectDir)` registra recursos `net://meta/{branch,stack,coverage,versions,services,pending}`.
- **AC-2**: cada recurso devuelve el dato del snapshot correspondiente (texto).
- **AC-3**: PURE/determinista: recurso desconocido → error; sin snapshot → defaults.
- **AC-4**: reutiliza buildSnapshot (no duplica lógica).

## Escenarios
```
Feature: MCP resources (net://meta/*)

  Scenario: registra los recursos meta
    Given un proyecto
    When  registerMetaResources(server, dir)
    Then  expone net://meta/branch, net://meta/coverage, etc.

  Scenario: recurso devuelve el dato del snapshot
    When  leo net://meta/branch
    Then  devuelve la rama del proyecto
```
