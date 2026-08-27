/**
 * rol: A2A Server de NetRunner (W4.E4.1, features/a2a.feature AC-3/AC-4).
 * Expone el ToolRegistry central (buildNetrunnerRegistry) como un agente A2A v1.0:
 * el AgentExecutor delega en registry.call() y publica el task lifecycle
 * (submitted → working → artifact → completed/failed). PROYECTA el MISMO contrato,
 * no reimplementa handlers (DEC-005 §3, igual que MCP/ACP).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente A2A remoto,
 *   quiero delegar tareas a NetRunner vía SendMessage,
 *   para operar el proyecto con el mismo contrato de tools (cualquier agente <-> cualquier agente).
 *
 * AC (features/a2a.feature):
 *   AC-3 createA2AServer construye un DefaultRequestHandler con el registry proyectado.
 *   AC-3b SendMessage de una tool conocida completa la tarea con artifact del resultado.
 *   AC-3c una tool desconocida falla la tarea (failed).
 *   AC-4 el executor publica el lifecycle submitted → working → completed.
 */
import { createInterface } from 'node:readline'
import { DefaultRequestHandler, InMemoryTaskStore, DefaultExecutionEventBusManager, JsonRpcTransportHandler, AgentEvent, defaultServerCallContextBuilder } from '@a2a-js/sdk/server'
import { TaskState, Role } from '@a2a-js/sdk'
import type { AgentExecutor, ExecutionEventBus, RequestContext, ServerCallContext } from '@a2a-js/sdk/server'
import type { Task, Message, Part, AgentCard } from '@a2a-js/sdk'
import { buildNetrunnerRegistry } from '../core/registry-factory'
import { buildAgentCard } from './agent-card'
import type { ToolRegistry, ToolContext } from '../core/registry'

/** rol: parsea el mensaje del usuario como invocación de tool {toolId, args}. */
function parseToolInvocation(message: Message): { toolId: string; args: Record<string, unknown> } {
  const part = message.parts[0]
  const text = part?.content?.$case === 'text' ? part.content.value : ''
  try {
    const parsed = JSON.parse(text) as { toolId?: string; args?: Record<string, unknown> }
    return { toolId: parsed.toolId ?? '', args: parsed.args ?? {} }
  } catch {
    return { toolId: '', args: {} }
  }
}

/** rol: construye un Part de texto con el resultado serializado. */
function textPart(text: string): Part {
  return { content: { $case: 'text', value: text }, metadata: undefined, filename: '', mediaType: 'text/plain' }
}

/** rol: construye un Task en estado submitted (primer evento del lifecycle). */
function submittedTask(taskId: string, contextId: string): Task {
  return {
    id: taskId,
    contextId,
    status: { state: TaskState.TASK_STATE_SUBMITTED, message: undefined, timestamp: new Date().toISOString() },
    artifacts: [],
    history: [],
    metadata: undefined,
  }
}

/**
 * rol: construye el AgentExecutor que delega en el registry (testable).
 * Interpreta el mensaje del usuario como {toolId, args} y llama registry.call().
 * Publica el lifecycle: task(submitted) → statusUpdate(working) → artifactUpdate →
 * statusUpdate(completed|failed).
 */
export function buildAgentExecutor(registry: ToolRegistry, projectDir: string): AgentExecutor {
  const ctx: ToolContext = { projectDir, secrets: {}, profile: 'explore' }

  const execute = async (requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> => {
    const { taskId, contextId } = requestContext
    // primer evento: task submitted (el server exige task/message primero)
    eventBus.publish(AgentEvent.task(submittedTask(taskId, contextId)))
    eventBus.publish(AgentEvent.statusUpdate({
      taskId,
      contextId,
      status: { state: TaskState.TASK_STATE_WORKING, message: undefined, timestamp: new Date().toISOString() },
      metadata: undefined,
    }))

    const { toolId, args } = parseToolInvocation(requestContext.userMessage)
    try {
      if (!toolId) throw new Error('mensaje no es una invocación de tool: falta toolId')
      const result = await registry.call(toolId, args, ctx)
      // artifact con el resultado serializado (viene de registry.call, no se duplica)
      eventBus.publish(AgentEvent.artifactUpdate({
        taskId,
        contextId,
        artifact: {
          artifactId: 'result',
          name: toolId,
          description: `Resultado de ${toolId}`,
          parts: [textPart(JSON.stringify(result))],
          metadata: undefined,
          extensions: [],
        },
        append: false,
        lastChunk: true,
        metadata: undefined,
      }))
      eventBus.publish(AgentEvent.statusUpdate({
        taskId,
        contextId,
        status: { state: TaskState.TASK_STATE_COMPLETED, message: undefined, timestamp: new Date().toISOString() },
        metadata: undefined,
      }))
    } catch (err) {
      eventBus.publish(AgentEvent.statusUpdate({
        taskId,
        contextId,
        status: {
          state: TaskState.TASK_STATE_FAILED,
          message: { messageId: `m-${taskId}`, contextId, taskId, role: Role.ROLE_AGENT, parts: [textPart(String((err as Error).message))], metadata: undefined, extensions: [], referenceTaskIds: [] },
          timestamp: new Date().toISOString(),
        },
        metadata: undefined,
      }))
    }
  }

  const cancelTask = async (taskId: string, eventBus: ExecutionEventBus): Promise<void> => {
    eventBus.publish(AgentEvent.statusUpdate({
      taskId,
      contextId: '',
      status: { state: TaskState.TASK_STATE_CANCELED, message: undefined, timestamp: new Date().toISOString() },
      metadata: undefined,
    }))
  }

  return { execute, cancelTask }
}

/**
 * rol: construye el DefaultRequestHandler A2A con el registry proyectado (testable).
 * projectDir es el proyecto a operar. El Agent Card se genera desde el registry.
 */
export async function createA2AServer(projectDir: string): Promise<DefaultRequestHandler> {
  const registry = buildNetrunnerRegistry()
  const card: AgentCard = buildAgentCard(registry, { projectDir })
  const executor = buildAgentExecutor(registry, projectDir)
  const taskStore = new InMemoryTaskStore()
  const eventBusManager = new DefaultExecutionEventBusManager()
  return new DefaultRequestHandler(card, taskStore, executor, eventBusManager)
}

/** rol: construye un ServerCallContext para una request stdio (sin auth). */
function buildContext(): ServerCallContext {
  return defaultServerCallContextBuilder({
    extensions: undefined,
    user: undefined,
    headers: {},
    requestedVersion: '1.0',
    tenant: '',
  })
}

/**
 * rol: arranca el A2A server por stdio (JSON-RPC sobre ndjson, como --mcp/--acp).
 * Lee requests JSON-RPC de stdin, los procesa con el JsonRpcTransportHandler y
 * responde por stdout. Mantiene el proceso vivo.
 */
export async function serveA2A(projectDir: string): Promise<void> {
  const handler = new JsonRpcTransportHandler(await createA2AServer(projectDir))
  const rl = createInterface({ input: process.stdin, terminal: false })

  rl.on('line', async (line: string) => {
    if (!line.trim()) return
    try {
      const res = await handler.handle(line, buildContext())
      if (res && typeof (res as { next?: unknown }).next === 'function') {
        // streaming (no usado en el MVP, pero soportado por el SDK)
        for await (const chunk of res as AsyncGenerator<unknown>) {
          process.stdout.write(JSON.stringify(chunk) + '\n')
        }
      } else if (res) {
        process.stdout.write(JSON.stringify(res) + '\n')
      }
    } catch (err) {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: String((err as Error).message) } }) + '\n')
    }
  })

  await new Promise<void>(() => {}) // nunca resuelve → el proceso queda vivo
}
