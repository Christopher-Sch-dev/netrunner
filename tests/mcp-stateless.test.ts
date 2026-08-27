import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { z } from 'zod'
import { createServer, statelessHeaders, STATELESS_PROTOCOL_VERSION, TOOLS_LIST_TTL_MS } from '../src/transport/mcp-server'

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

// role: MCP stateless 2026-07-28 conformance (W4.E4.3, features/mcp-stateless.feature).
// El SDK @modelcontextprotocol/sdk 1.30.0 NO implementa el stateless nativamente; la capa
// de compatibilidad añade server/discover + tools/list cacheable + headers Mcp-Method/Mcp-Name.

/** rol: schema del RPC custom server/discover (stateless 2026-07-28). */
const DiscoverRequestSchema = z.object({ method: z.literal('server/discover') })
const DiscoverResultSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.record(z.string(), z.unknown()),
  toolsets: z.array(z.object({ id: z.string(), description: z.string() })),
})

/** rol: invoca un RPC custom en el client (request es protected en el SDK). */
async function callDiscover(client: Client): Promise<z.infer<typeof DiscoverResultSchema>> {
  const request = (client as unknown as { request: (req: unknown, schema: typeof DiscoverResultSchema) => Promise<unknown> }).request
  return (await request.call(client, { method: 'server/discover' }, DiscoverResultSchema)) as z.infer<typeof DiscoverResultSchema>
}

describe('mcp-server (stateless 2026-07-28)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-mcp-stateless-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const A = 1\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('AC-1: server/discover devuelve protocolVersion 2026-07-28, capabilities y toolsets', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const discover = await callDiscover(client)

    expect(discover.protocolVersion).toBe(STATELESS_PROTOCOL_VERSION)
    expect(discover.capabilities).toBeDefined()
    // progressive disclosure: expone los toolsets disponibles (graph/stack/ops para TS)
    const ids = discover.toolsets.map((t) => t.id)
    expect(ids).toContain('graph')
    expect(ids).toContain('stack')
    expect(ids).toContain('ops')

    await client.close()
  })

  it('AC-2: tools/list es cacheable — trae _meta.ttlMs y _meta.cacheScope', async () => {
    const server = await createServer(dir)
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const list = await client.listTools()
    const meta = (list as unknown as { _meta?: { ttlMs?: number; cacheScope?: string } })._meta

    expect(meta).toBeDefined()
    expect(meta?.ttlMs).toBe(TOOLS_LIST_TTL_MS)
    expect(meta?.cacheScope).toBe('global')

    await client.close()
  })

  it('AC-3: statelessHeaders devuelve Mcp-Method y Mcp-Name para routing HTTP', () => {
    const headers = statelessHeaders('tools/call', 'search')
    expect(headers['Mcp-Method']).toBe('tools/call')
    expect(headers['Mcp-Name']).toBe('search')
  })

  it('AC-3b: statelessHeaders sin name omite Mcp-Name (métodos sin tool)', () => {
    const headers = statelessHeaders('server/discover')
    expect(headers['Mcp-Method']).toBe('server/discover')
    expect(headers['Mcp-Name']).toBeUndefined()
  })
})
