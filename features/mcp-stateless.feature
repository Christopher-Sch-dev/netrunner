# Gherkin — MCP stateless 2026-07-28 (src/transport/mcp-server.ts)

## SPEC (Mandamiento 0)
**Como** un agente que se conecta a un proyecto Netrunner por MCP,
**quiero** que el server hable el protocolo stateless 2026-07-28
(`server/discover` + `tools/list` cacheable con `ttlMs`/`cacheScope` + headers
`Mcp-Method`/`Mcp-Name`),
**para** que cualquier request pueda aterrizar en cualquier instancia detrás de un
load balancer round-robin sin estado compartido, y los clientes cacheen el catálogo
de tools (blog.modelcontextprotocol.io/posts/2026-07-28/).

## Acceptance Criteria
- **AC-1**: el server responde `server/discover` con `protocolVersion: '2026-07-28'`,
  `capabilities` y los toolsets disponibles (progressive disclosure).
- **AC-2**: `tools/list` devuelve `_meta.ttlMs` y `_meta.cacheScope` (cacheable).
- **AC-3**: `statelessHeaders(method, name)` devuelve los headers `Mcp-Method`/`Mcp-Name`
  para routing HTTP (gateway/WAF).
- **AC-4**: el handshake MCP real (initialize → tools/list → server/discover) responde
  correctamente por stdio.

## Escenarios
```
Feature: MCP stateless 2026-07-28

  Scenario: server/discover expone capacidades y toolsets
    Given un proyecto conectado por MCP
    When  llamo server/discover
    Then  devuelve protocolVersion 2026-07-28, capabilities y toolsets

  Scenario: tools/list es cacheable
    When  llamo tools/list
    Then  el resultado trae _meta.ttlMs y _meta.cacheScope

  Scenario: headers Mcp-Method/Mcp-Name para routing
    When  construyo statelessHeaders('tools/call', 'search')
    Then  devuelve { 'Mcp-Method': 'tools/call', 'Mcp-Name': 'search' }
```
