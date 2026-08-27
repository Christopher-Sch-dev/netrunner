import { describe, it, expect, vi } from 'vitest'
import { buildNetrunnerRegistry } from '../src/core/registry-factory'
import { dumpContract, toolHelp } from '../src/discovery/index'

// mock bun:sqlite → node:sqlite (so queries.ts can resolve)
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

// role: tests for auto-discovery (AC-1..4 of features/discovery.feature).
// The agent discovers exactly what it can operate without guessing.

describe('auto-descubrimiento', () => {
  it('dump imprime el contrato completo (AC-1)', () => {
    const registry = buildNetrunnerRegistry()
    const contract = dumpContract(registry)

    expect(contract.tools.length).toBeGreaterThan(0)
    expect(contract.toolsets).toBeDefined()
    expect(contract.capabilities).toBeDefined()
    // each tool has id, description, readOnly, schema
    const tool = contract.tools[0]
    expect(tool.id).toBeDefined()
    expect(tool.description).toBeDefined()
    expect(typeof tool.readOnly).toBe('boolean')
    expect(tool.schema).toBeDefined()
  })

  it('toolHelp imprime el inputSchema de una tool (AC-3)', () => {
    const registry = buildNetrunnerRegistry()
    const help = toolHelp(registry, 'graph.explore')

    expect(help.id).toBe('graph.explore')
    expect(help.schema).toBeDefined()
    expect(help.schema.name).toBeDefined() // explore tiene input name
  })

  it('toolHelp de tool desconocida → error (AC-4)', () => {
    const registry = buildNetrunnerRegistry()
    expect(() => toolHelp(registry, 'nope')).toThrow(/unknown/i)
  })
})
