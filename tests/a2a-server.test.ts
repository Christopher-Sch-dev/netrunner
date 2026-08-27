import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createA2AServer, buildAgentExecutor } from '../src/transport/a2a-server'
import { buildNetrunnerRegistry } from '../src/core/registry-factory'
import { DefaultRequestHandler, DefaultExecutionEventBusManager, RequestContext, defaultServerCallContextBuilder } from '@a2a-js/sdk/server'
import { TaskState, Role } from '@a2a-js/sdk'
import type { SendMessageRequest, Message, Part } from '@a2a-js/sdk'

// mock bun:sqlite → node:sqlite (same API) so vitest (node) can resolve queries.ts
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...args: unknown[]) => (db.prepare(sql) as { get: (...a: unknown[]) => unknown }).get(...args),
          all: (...args: unknown[]) => (db.prepare(sql) as { all: (...a: unknown[]) => unknown }).all(...args),
          run: (...args: unknown[]) => (db.prepare(sql) as { run: (...a: unknown[]) => unknown }).run(...args),
        }
      }
    },
  }
})

// role: A2A server conformance (W4.E4.1, features/a2a.feature AC-3/AC-4).
// El server proyecta el MISMO ToolRegistry (DEC-005 §3): SendMessage delega en
// registry.call() y publica el task lifecycle (submitted → working → completed/failed).

/** rol: construye un SendMessageRequest que invoca una tool del registry. */
function toolMessage(toolId: string, args: Record<string, unknown>): SendMessageRequest {
  const part: Part = { content: { $case: 'text', value: JSON.stringify({ toolId, args }) }, metadata: undefined, filename: '', mediaType: 'text/plain' }
  const message: Message = {
    messageId: 'm1',
    contextId: 'ctx1',
    taskId: '',
    role: Role.ROLE_USER,
    parts: [part],
    metadata: undefined,
    extensions: [],
    referenceTaskIds: [],
  }
  return { tenant: '', message, configuration: undefined, metadata: undefined }
}

describe('a2a-server (A2A v1.0)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-a2a-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const A = 1\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('AC-3: createA2AServer construye un DefaultRequestHandler con el registry proyectado', async () => {
    const server = await createA2AServer(dir)
    expect(server).toBeInstanceOf(DefaultRequestHandler)
    const card = await server.getAgentCard()
    expect(card.name).toBe('netrunner')
    expect(card.skills.length).toBeGreaterThan(0)
  })

  it('AC-3b: SendMessage de una tool conocida completa la tarea con artifact del resultado', async () => {
    const server = await createA2AServer(dir)
    const result = await server.sendMessage(toolMessage('stack.info', {}), { requestedVersion: '1.0' } as never)
    // devuelve un Task (no un Message directo)
    expect(result).toHaveProperty('id')
    const task = result as { id: string; status: { state: TaskState }; artifacts: Array<{ parts: Part[] }> }
    expect(task.status.state).toBe(TaskState.TASK_STATE_COMPLETED)
    expect(task.artifacts.length).toBeGreaterThan(0)
    // el artifact contiene el resultado serializado (viene de registry.call)
    const text = task.artifacts[0].parts[0].content
    expect(text).toBeDefined()
    expect(JSON.stringify(text)).toContain('ok')
  })

  it('AC-3c: una tool desconocida falla la tarea (failed)', async () => {
    const server = await createA2AServer(dir)
    const result = await server.sendMessage(toolMessage('graph.nonexistent', {}), { requestedVersion: '1.0' } as never)
    const task = result as { status: { state: TaskState } }
    expect(task.status.state).toBe(TaskState.TASK_STATE_FAILED)
  })

  it('AC-4: el executor publica el lifecycle submitted → working → completed', async () => {
    const registry = buildNetrunnerRegistry()
    const executor = buildAgentExecutor(registry, dir)
    const bus = new DefaultExecutionEventBusManager().createOrGetByTaskId('t1')
    const events: string[] = []
    bus.on('event', (e) => events.push(e.kind))
    const context = defaultServerCallContextBuilder({ extensions: undefined, user: undefined, headers: {}, requestedVersion: '1.0', tenant: '' })
    const ctx = new RequestContext(toolMessage('stack.info', {}), 't1', 'ctx1', context)
    await executor.execute(ctx, bus)
    // el primer evento debe ser task (submitted) y luego statusUpdate (working/completed)
    expect(events[0]).toBe('task')
    expect(events).toContain('statusUpdate')
  })
})
