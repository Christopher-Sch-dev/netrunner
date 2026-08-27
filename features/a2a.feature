# Gherkin — A2A Server + Agent Card (src/transport/a2a-server.ts, src/transport/agent-card.ts)

## SPEC (Mandamiento 0)
**Como** un agente A2A remoto (cualquier agente <-> cualquier agente, visión de Cris),
**quiero** que NetRunner se exponga como un A2A Server v1.0 con su Agent Card,
**para** que otros agentes descubran sus capacidades (skills) y le deleguen tareas
vía `SendMessage`/`task/send`, operando el proyecto con el MISMO contrato de tools.

## Culturización externa (A2A v1.0, a2a-protocol.org + @a2a-js/sdk 1.1.0)
- **Agent Card**: JSON self-describing (name, description, version, supportedInterfaces,
  capabilities, defaultInputModes/OutputModes, skills). Cada `AgentSkill` = {id, name,
  description, tags, examples, inputModes, outputModes}. (spec §4.4.1/§4.4.5)
- **Métodos JSON-RPC**: `SendMessage` (envía Message → devuelve Task o Message),
  `GetTask`, `ListTasks`, `CancelTask`, `SendStreamingMessage`. (spec §5.3, §9)
- **Task lifecycle**: submitted → working → completed/failed/canceled. (spec §3.1)
- **SDK oficial**: `@a2a-js/sdk` (Google, Apache-2.0). Server = `AgentExecutor`
  (business logic) + `DefaultRequestHandler` (routing/task store) + `JsonRpcTransportHandler`
  (framework-agnostic JSON-RPC). `AgentEvent.task/statusUpdate/artifactUpdate` para publicar.
- **Decisión mínima funcional**: server stdio (como --mcp/--acp) con JSON-RPC sobre ndjson,
  exponiendo `SendMessage`/`GetTask`/`ListTasks`/`CancelTask`. Sin streaming ni push
  (capabilities false). Cada tool del ToolRegistry → un AgentSkill del card; el mensaje
  del usuario se interpreta como invocación de tool (`toolId` + args JSON) y se delega en
  `registry.call()` (DEC-005 §3: proyecta el MISMO contrato, no duplica handlers).

## Acceptance Criteria
- **AC-1**: `buildAgentCard(registry, opts)` genera un AgentCard A2A v1.0 válido
  (name, description, version, supportedInterfaces JSONRPC 1.0, capabilities, skills).
- **AC-2**: cada tool del ToolRegistry se proyecta a un `AgentSkill` (id, name, description,
  tags) — no se duplica la lógica de handlers (DEC-005 §3).
- **AC-3**: `createA2AServer(projectDir)` construye un `DefaultRequestHandler` con un
  `AgentExecutor` que delega en `registry.call()` y publica el task lifecycle
  (submitted → working → artifact → completed/failed).
- **AC-4**: `serveA2A(projectDir)` arranca el server por stdio (JSON-RPC ndjson),
  respondiendo `SendMessage`, `GetTask`, `ListTasks`, `CancelTask`.
- **AC-5**: el CLI `--a2a` arranca el server (como `--mcp`/`--acp`).

## Escenarios
```
Feature: A2A Server + Agent Card

  Scenario: el Agent Card proyecta las tools del registry como skills
    Given un ToolRegistry con tools registradas
    When  genero el Agent Card
    Then  cada tool aparece como un AgentSkill (id/name/description/tags)
    And   el card declara supportedInterfaces JSONRPC protocolVersion 1.0

  Scenario: SendMessage delega en el registry y completa la tarea
    Given un server A2A sobre un projectDir
    When  envío un mensaje que invoca una tool del registry
    Then  la tarea pasa a completed con un artifact con el resultado
    And   el resultado viene de registry.call() (no se duplica)

  Scenario: una tool desconocida falla la tarea
    When  envío un mensaje que invoca una tool inexistente
    Then  la tarea pasa a failed
```
