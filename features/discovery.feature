# Gherkin — Auto-descubrimiento (Wave B, gap real #1 del validador)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** descubrir exactamente qué tools/parámetros puedo operar sin adivinar,
**para** que el agente sepa qué puede hacer y con qué parámetros (auto-descubrimiento,
el gap real de producto que el validador marcó como #1).

## Acceptance Criteria
- **AC-1**: `netrunner dump` imprime el contrato completo (tools, toolsets, capabilities) como JSON.
- **AC-2**: `net_list_tools` (MCP) devuelve el catálogo de tools del toolset habilitado (id, descripción, readOnly, schema).
- **AC-3**: `netrunner <tool> --help` imprime el inputSchema de la tool (JSON Schema).
- **AC-4**: PURE/determinista: output JSON limpio, sin adivinar.

## Escenarios
```
Feature: Auto-descubrimiento

  Scenario: dump imprime el contrato completo
    Given un proyecto
    When  netrunner dump
    Then  devuelve { tools, toolsets, capabilities } como JSON

  Scenario: <tool> --help imprime el schema
    When  netrunner explore --help
    Then  devuelve el inputSchema de explore (name: string)
```
