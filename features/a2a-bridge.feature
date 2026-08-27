# A2A Bridge — expone un agente A2A remoto como tool MCP local (W4.E4.2)

> Patrón Nexarion (A2A-MCP bridge): un MCP server envuelve un cliente A2A y expone
> agentes remotos como tools en el registry MCP. Para el LLM, invocar un agente
> remoto es idéntico a llamar una tool local. MCP = vertical (agente→tools),
> A2A = horizontal (agente↔agente); complementarios, no competidores.

## Spec (Mandamiento 0)

**Como** un agente conectado por MCP a un proyecto Netrunner,
**quiero** invocar un agente A2A remoto como si fuera una tool local del ToolRegistry,
**para** delegar subtareas a agentes horizontales sin salir del contrato único de tools.

## Acceptance Criteria

- **AC-1** `registerA2ABridge(registry, opts)` registra en el ToolRegistry una tool
  `a2a.<agentId>` que llama al agente A2A remoto vía `tasks/send`.
- **AC-2** la tool es `readOnly: false` (delega trabajo a un agente externo → muta
  estado remoto) y su `capabilities` incluye el perfil dado.
- **AC-3** el execute envía un mensaje A2A `{role:'user', parts:[{kind:'text',text}]}`
  al endpoint remoto y devuelve el texto concatenado de los artifacts del task.
- **AC-4** si el task no termina en `completed`, la tool lanza un error descriptivo.
- **AC-5** el cliente A2A es inyectado (DI, Mandamiento 2): el bridge recibe un
  `sendTask` por parámetro, nunca `new` hardcodeado.
- **AC-6** el bridge es idempotente: registrar el mismo agente dos veces lanza
  `Tool already registered` (regla del ToolRegistry).

## Gherkin

```gherkin
Feature: A2A Bridge (exponer agente A2A remoto como tool MCP local)

  Scenario: registrar el bridge expone una tool a2a.<agentId> en el registry
    Given un ToolRegistry vacío
    And un cliente A2A inyectado que responde a tasks/send
    When registro el bridge con agentId "reviewer" y endpoint "https://a2a.local"
    Then el registry contiene la tool "a2a.reviewer"
    And la tool es mutating (readOnly false)
    And la tool pertenece al perfil "explore"

  Scenario: invocar la tool delega al agente remoto vía tasks/send
    Given un bridge registrado con un cliente A2A que responde completed
    When llamo la tool con input { text: "revisa este contrato" }
    Then el cliente A2A recibió un mensaje user con ese texto
    And el resultado contiene el texto de los artifacts del task

  Scenario: task no completado lanza error descriptivo
    Given un bridge registrado con un cliente A2A que responde failed
    When llamo la tool
    Then lanza un error que menciona el estado del task

  Scenario: registrar el mismo agente dos veces lanza error
    Given un bridge ya registrado con agentId "reviewer"
    When intento registrar el bridge de nuevo con el mismo agentId
    Then lanza "Tool already registered"
```
