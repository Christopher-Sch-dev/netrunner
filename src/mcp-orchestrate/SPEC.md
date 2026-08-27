# Spec — Orquestador MCP real (Wave E1)

> Contrato del orquestador MCP de NetRunner. Scope disjunto: `src/mcp-orchestrate/*`,
> `src/cli/commands/orchestrate.ts`, `tests/mcp-orchestrate.test.ts`.

## As / I want / so that

**As** un agente que opera un proyecto NetRunner,
**I want** que `netrunner mcp-orchestrate` descubra los servers MCP del proyecto
(desde `.mcp.json`), los conecte como CLIENTE, y exponga sus tools como un solo
contrato (registry agregado con prefijo por server),
**so that** el agente ve UNA superficie de tools unificada en vez de N servers
separados (visión de Cris: UNA herramienta universal que reemplaza TODAS las separadas).

## Target

**T0** — local, sin servidores obligatorios. Conecta servers MCP por stdio (spawn de proceso).

## Acceptance Criteria (AC)

- **AC-1**: `discoverServers(projectDir)` lee `.mcp.json` (`mcpServers`) y devuelve la
  lista de configs de servers (name, command, args). Si no hay `.mcp.json`, devuelve `[]`.
- **AC-2**: `McpOrchestrator.connectAll()` conecta cada server como CLIENTE
  (`Client` + `StdioClientTransport`) y devuelve el estado de cada server
  (connected, tools descubiertas, o error si falló).
- **AC-3**: `listTools()` agrega las tools de todos los servers conectados en un solo
  contrato, con id único `serverName.toolName` (prefijo por server → sin colisiones).
- **AC-4**: `callTool(id, args)` delega la llamada al server correcto (parsea el prefijo)
  y devuelve el resultado. Id desconocido → error.
- **AC-5**: `close()` cierra todos los transports (no deja procesos huérfanos).
- **AC-6**: CLI `netrunner mcp-orchestrate` lista servers descubiertos + tools agregadas
  (JSON estable, exit 0). Sin servers → lista vacía, exit 0.

## Gherkin (features/mcp-orchestrate.feature)

```gherkin
Feature: Orquestador MCP real
  Scenario: Descubrir servers desde .mcp.json
    Given un proyecto con .mcp.json que declara 2 servers
    When discoverServers(projectDir) corre
    Then devuelve 2 configs con name/command/args

  Scenario: Conectar servers y agregar sus tools
    Given un server MCP real (stdio) con la tool "echo"
    When el orquestador conecta y lista tools
    Then la tool aparece como "serverName.echo" en el contrato único

  Scenario: Llamar una tool agregada
    Given un server conectado con la tool "echo"
    When callTool("serverName.echo", {text:"hola"}) corre
    Then delega al server y devuelve el resultado

  Scenario: Id desconocido
    Given un orquestador conectado
    When callTool("noexiste.tool", {}) corre
    Then lanza error de tool desconocida

  Scenario: CLI lista servers y tools
    Given un proyecto con .mcp.json
    When netrunner mcp-orchestrate corre
    Then emite JSON con servers y tools agregadas (exit 0)
```
