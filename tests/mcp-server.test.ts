import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer, toolsetsFor } from '../src/transport/mcp-server'

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

// role: MCP conformance (AC-3, AC-9) — progressive disclosure by stack + idempotency.
// Uses InMemoryTransport + a real Client (no subprocess), as the universality matrix requires.

describe('mcp-server (progressive disclosure)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-mcp-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const A = 1\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('toolsetsFor: un stack TS activa graph, stack y ops', () => {
    const t = toolsetsFor({ language: 'typescript', framework: 'unknown' })
    expect(t.map((x) => x.id)).toEqual(['graph', 'stack', 'ops'])
  })

  it('al conectar solo expone meta-tools (progressive disclosure), no 500', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const list = await client.listTools()
    const names = list.tools.map((t) => t.name).sort()

    // only meta-tools at the start — NOT the graph tools (net_explore etc)
    expect(names).toEqual(['net_available_toolsets', 'net_enable_toolset', 'net_init', 'net_run', 'net_set_project'])
    expect(names).not.toContain('net_explore')
    expect(names).not.toContain('net_stack')

    await client.close()
  })

  it('habilitar el toolset registra dinámicamente las tools del grafo', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const res = await client.callTool({ name: 'net_enable_toolset', arguments: { toolset: 'graph' } })
    const blocks = res.content as unknown as Array<{ type?: string; text?: string }>
    expect(blocks[0]?.text ?? '').toContain('habilitado')

    const list = await client.listTools()
    const names = list.tools.map((t) => t.name).sort()
    expect(names).toContain('net_explore')
    expect(names).toContain('net_callers')
    expect(names).toContain('net_callees')
    expect(names).toContain('net_impact')

    await client.close()
  })

  it('idempotente: habilitar el mismo toolset dos veces no duplica tools', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    await client.callTool({ name: 'net_enable_toolset', arguments: { toolset: 'graph' } })
    await client.callTool({ name: 'net_enable_toolset', arguments: { toolset: 'graph' } })

    const list = await client.listTools()
    const names = list.tools.map((t) => t.name)
    expect(names.filter((n) => n === 'net_explore')).toHaveLength(1)

    await client.close()
  })

  it('net_set_project: cambia el proyecto en runtime (AC-1..5)', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    // dir inválido → error estructurado, no cambia nada (AC-2)
    const bad = await client.callTool({ name: 'net_set_project', arguments: { dir: '/no/existe' } })
    const badText = (bad.content as unknown as Array<{ text?: string }>)[0]?.text ?? ''
    expect(badText).toContain('INVALID_DIR')

    // dir válido → ok + stack (AC-3, AC-4)
    const good = await client.callTool({ name: 'net_set_project', arguments: { dir } })
    const goodText = (good.content as unknown as Array<{ text?: string }>)[0]?.text ?? ''
    expect(goodText).toContain('"ok":true')
    expect(goodText).toContain('"projectDir"')

    // idempotente: setear el mismo dir no rompe (AC-5)
    const again = await client.callTool({ name: 'net_set_project', arguments: { dir } })
    expect((again.content as unknown as Array<{ text?: string }>)[0]?.text ?? '').toContain('"ok":true')

    await client.close()
  })

  it('net_init: inicializa un proyecto (P6 AC-1..2)', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    // dir inválido → error estructurado (AC-2)
    const bad = await client.callTool({ name: 'net_init', arguments: { dir: '/no/existe' } })
    expect((bad.content as unknown as Array<{ text?: string }>)[0]?.text ?? '').toContain('INVALID_DIR')

    // dir válido → ok + counts (AC-1)
    const good = await client.callTool({ name: 'net_init', arguments: { dir } })
    const goodText = (good.content as unknown as Array<{ text?: string }>)[0]?.text ?? ''
    expect(goodText).toContain('"ok":true')
    expect(goodText).toContain('"counts"')

    await client.close()
  })

  it('net_run: comando fuera de allowlist se rechaza (P7.1 AC-3)', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    // comando fuera de allowlist → error estructurado, no ejecuta (AC-3)
    const forbidden = await client.callTool({ name: 'net_run', arguments: { command: 'rm' } })
    expect((forbidden.content as unknown as Array<{ text?: string }>)[0]?.text ?? '').toContain('FORBIDDEN_COMMAND')

    await client.close()
  })
})
