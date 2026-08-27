import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer, toolsetsFor } from '../src/transport/mcp-server'

// mock bun:sqlite → node:sqlite (mismo API) para que vitest (node) resuelva queries.ts
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

// rol: conformance MCP (AC-3, AC-9) — progressive disclosure por stack + idempotencia.
// Usa InMemoryTransport + Client real (sin subproceso), como exige la matriz de universalidad.

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

    // solo meta-tools al inicio — NO las tools del grafo (net_explore etc)
    expect(names).toEqual(['net_available_toolsets', 'net_enable_toolset'])
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
})
