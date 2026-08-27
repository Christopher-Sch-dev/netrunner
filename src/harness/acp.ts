/**
 * rol: Adapter ACP de Netrunner (vista harness-adapter ACP, DEC-005 §3).
 * Conecta el motor como un agente ACP (Agent Client Protocol) por stdio, para
 * que IDEs/clientes ACP (Zed, Neovim, VS Code) operen el proyecto. PROYECTA el
 * MISMO ToolRegistry central (buildNetrunnerRegistry) — no reimplementa handlers:
 * `session/prompt` delega en `registry.call()`. (Igual que la vista MCP.)
 *
 * SPEC (Mandamiento 0):
 *   Como un IDE ACP, quiero que Netrunner se conecte como agente ACP,
 *   para operar el proyecto desde el editor vía el contrato de tools.
 *
 * AC (features/acp.feature):
 *   AC-1 serveACP arranca agente ACP por stdio (ndJsonStream).
 *   AC-2 registra handlers initialize/session/new/authenticate/session/prompt/cancel.
 *   AC-3 session/prompt responde end_turn + chunks con datos del grafo vía ctx.notify.
 *   AC-4 proyecta el MISMO ToolRegistry (no duplica).
 */
import { Readable, Writable } from 'node:stream'
import * as acp from '@agentclientprotocol/sdk'
import { buildNetrunnerRegistry } from '../core/registry-factory'
import type { ToolRegistry, ToolContext } from '../core/registry'

/** Tipos de stream web (definidos localmente para no depender de la export del SDK). */
type WebReadable = ReadableStream<Uint8Array>
type WebWritable = WritableStream<Uint8Array>

/** Session del agente: guarda pendingPrompt para cancel. */
interface AcpSession {
  pendingPrompt: AbortController | null
}

/** rol: construye el handler del agente ACP con el registry inyectado. */
function buildAcpAgent(projectDir: string, registry: ToolRegistry) {
  const sessions = new Map<string, AcpSession>()

  const initialize = async (_params: acp.InitializeRequest): Promise<acp.InitializeResponse> => ({
    protocolVersion: acp.PROTOCOL_VERSION,
    agentCapabilities: { loadSession: false },
  })

  const newSession = async (_: acp.NewSessionRequest): Promise<acp.NewSessionResponse> => {
    const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    sessions.set(sessionId, { pendingPrompt: null })
    return { sessionId }
  }

  const authenticate = async (_: acp.AuthenticateRequest): Promise<acp.AuthenticateResponse> => ({})

  // PROYECCIÓN del contrato: ejecuta la tool del registry (AC-4, DEC-005 §3).
  const prompt = async (params: acp.PromptRequest, cx: acp.AgentContext): Promise<acp.PromptResponse> => {
    const session = sessions.get(params.sessionId)
    if (!session) throw new Error(`Session ${params.sessionId} not found`)
    session.pendingPrompt?.abort()
    session.pendingPrompt = new AbortController()
    try {
      // contexto del grafo → notifica chunks (proyecta registry.discover)
      const ctx: ToolContext = { projectDir, secrets: {}, profile: 'explore' }
      const tools = registry.discover('explore').slice(0, 5)
      await cx.notify(acp.methods.client.session.update, {
        sessionId: params.sessionId,
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: `Netrunner: ${tools.length} tools del contrato disponibles.` } },
      })
      // explora un símbolo de ejemplo si hay alguno
      if (tools.length > 0) {
        const r = await registry.call(tools[0].id, {}, ctx)
        await cx.notify(acp.methods.client.session.update, {
          sessionId: params.sessionId,
          update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: JSON.stringify(r) } },
        })
      }
    } catch (err) {
      if (session.pendingPrompt.signal.aborted) return { stopReason: 'cancelled' }
      throw err
    }
    session.pendingPrompt = null
    return { stopReason: 'end_turn' }
  }

  const cancel = async (params: acp.CancelNotification): Promise<void> => {
    sessions.get(params.sessionId)?.pendingPrompt?.abort()
  }

  return { initialize, newSession, authenticate, prompt, cancel }
}

/** rol: arranca el agente ACP por stdio (AC-1). */
export function serveACP(projectDir: string): acp.AgentApp {
  const registry = buildNetrunnerRegistry()
  const a = acp.agent({ name: 'netrunner' })
  const agent = buildAcpAgent(projectDir, registry)

  // ndJsonStream para stdio (patrón oficial SDK)
  const input = Writable.toWeb(process.stdout) as WebWritable
  const output = Readable.toWeb(process.stdin) as WebReadable
  const stream = acp.ndJsonStream(input, output)

  return a
    .onRequest('initialize', (ctx) => agent.initialize(ctx.params))
    .onRequest('session/new', (ctx) => agent.newSession(ctx.params))
    .onRequest('authenticate', (ctx) => agent.authenticate(ctx.params))
    .onRequest('session/prompt', (ctx) => agent.prompt(ctx.params, ctx.client))
    .onNotification('session/cancel', (ctx) => agent.cancel(ctx.params))
    .connect(stream) as unknown as acp.AgentApp
}

// Si se ejecuta directo, arranca
if (import.meta.main) {
  serveACP(process.cwd())
}
