import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// mock bun:sqlite → node:sqlite
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

// role: test BUG3 — tools/list debe reflejar las tools dinámicas tras net_enable_toolset.
import { createServer } from '../src/transport/mcp-server'

describe('BUG3: tools/list refleja toolsets habilitados', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-bug3-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', scripts: { test: 'echo ok' } }))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('enable + tools/list refleja dinámicas (BUG3)', async () => {
    const server = await createServer(dir)
    const inner = server.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<unknown>>
    }
    const callHandler = inner._requestHandlers.get('tools/call')
    const listHandler = inner._requestHandlers.get('tools/list')

    // 1. enable graph
    await callHandler!({ method: 'tools/call', params: { name: 'net_enable_toolset', arguments: { toolset: 'graph' } } }, {})

    // 2. tools/list debe incluir las dinámicas
    const result = (await listHandler!({ method: 'tools/list', params: {} }, {})) as { tools: Array<{ name: string }> }
    const names = result.tools.map((t) => t.name)
    console.log('TOOLS_AFTER_ENABLE:', names)
    expect(names).toContain('net_explore')
  })
})
