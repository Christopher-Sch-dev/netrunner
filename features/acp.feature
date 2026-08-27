# Gherkin — Adapter ACP (src/harness/acp.ts)

## SPEC (Mandamiento 0)
**Como** un IDE/cliente ACP (Zed, Neovim, VS Code),
**quiero** que Netrunner se conecte como agente ACP por stdio,
**para** que el motor opere el proyecto desde el editor vía el contrato de tools
(grafo: explore/callers/callees/impact).

## Acceptance Criteria (DEC-005 §3: la vista ACP proyecta el MISMO contrato)
- **AC-1**: `serveACP(projectDir)` arranca un agente ACP por stdio (ndJsonStream).
- **AC-2**: registra handlers ACP: `initialize`, `session/new`, `authenticate`,
  `session/prompt`, `session/cancel` (patrón del SDK 1.4.0).
- **AC-3**: `session/prompt` responde con `stopReason: "end_turn"` y envia chunks
  de texto/tool-call con datos del grafo (explore) vía `ctx.notify`.
- **AC-4**: la vista ACP proyecta el MISMO ToolRegistry (buildNetrunnerRegistry),
  no reimplementa handlers (DEC-005 §3).

## Escenarios
```
Feature: Adapter ACP

  Scenario: arranca el agente y responde initialize
    Given projectDir
    When  creo el agente ACP
    Then  registra handlers initialize/session/new/prompt

  Scenario: el agente expone las tools del registry (no duplica)
    Then  los datos del grafo vienen de buildNetrunnerRegistry().call()
```
