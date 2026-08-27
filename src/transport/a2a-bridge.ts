/**
 * rol: Bridge MCP↔A2A (W4.E4.2, patrón Nexarion).
 * Expone un agente A2A remoto como una tool MCP local: registra en el ToolRegistry
 * una tool `a2a.<agentId>` que delega al agente remoto vía `tasks/send`.
 *
 * PATRÓN NEXARION (A2A-MCP bridge): un MCP server envuelve un cliente A2A y expone
 * agentes remotos como tools en el registry MCP. Para el LLM, invocar un agente
 * remoto es idéntico a llamar una tool local. MCP = vertical (agente→tools),
 * A2A = horizontal (agente↔agente); complementarios, no competidores.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente conectado por MCP a un proyecto Netrunner,
 *   quiero invocar un agente A2A remoto como si fuera una tool local del ToolRegistry,
 *   para delegar subtareas a agentes horizontales sin salir del contrato único.
 *
 * AC (features/a2a-bridge.feature):
 *   AC-1 registerA2ABridge registra una tool `a2a.<agentId>` que llama vía tasks/send.
 *   AC-2 la tool es readOnly:false (delega a un agente externo) y capabilities del perfil.
 *   AC-3 el execute envía un mensaje user y devuelve el texto de los artifacts.
 *   AC-4 task no completed → error descriptivo.
 *   AC-5 el cliente A2A es inyectado (DI, Mandamiento 2).
 *   AC-6 idempotente: registrar dos veces lanza "Tool already registered".
 */
import type { ToolRegistry, ToolSpec, ToolContext } from '../core/registry'

/**
 * rol: firma del cliente A2A inyectado (DI). Envía un task al endpoint remoto y
 * devuelve el estado terminal + el texto concatenado de los artifacts.
 * El transporte real (fetch → JSON-RPC tasks/send) se inyecta desde el caller.
 */
export type A2ASendTask = (endpoint: string, text: string) => Promise<{ state: string; text: string }>

/** rol: opciones del bridge (DI: el transporte se inyecta, nunca se hardcodea). */
export interface A2ABridgeOptions {
  /** id del agente remoto → tool `a2a.<agentId>`. */
  agentId: string
  /** endpoint A2A del agente remoto (ej. https://host/.well-known/agent.json). */
  endpoint: string
  /** cliente A2A inyectado (tasks/send). */
  sendTask: A2ASendTask
  /** perfil de objetivo que activa la tool (AC-9). Default 'explore'. */
  profile?: string
  /** descripción para el LLM. */
  description?: string
}

/** rol: construye la ToolSpec del bridge (proyección del contrato, AC-1/2). */
function bridgeSpec(opts: A2ABridgeOptions): ToolSpec {
  return {
    id: `a2a.${opts.agentId}`,
    description: opts.description ?? `Delega una tarea al agente A2A remoto '${opts.agentId}' (${opts.endpoint}).`,
    family: 'op', // delega trabajo a un agente externo → operación
    readOnly: false, // muta estado remoto (AC-2)
    capabilities: [opts.profile ?? 'explore'],
    inputSchema: { text: { type: 'string', description: 'Instrucción/tarea a delegar al agente remoto.' } },
    execute: async (input, _ctx: ToolContext) => {
      const text = String(input.text ?? '')
      const res = await opts.sendTask(opts.endpoint, text)
      if (res.state !== 'completed') {
        throw new Error(`a2a.${opts.agentId}: task terminó en estado '${res.state}' (no completed)`)
      }
      return { ok: true, data: res }
    },
  }
}

/**
 * rol: registra el bridge en el ToolRegistry (AC-1). Idempotente por la regla
 * del registry: registrar el mismo id dos veces lanza "Tool already registered".
 */
export function registerA2ABridge(registry: ToolRegistry, opts: A2ABridgeOptions): void {
  registry.register(bridgeSpec(opts))
}
