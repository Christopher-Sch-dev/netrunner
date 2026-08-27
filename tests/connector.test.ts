import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../src/core/registry'
import { registerConnector, type Connector } from '../src/plugin/connector'

// role: tests for domain connectors as plugins (AC-1..4 of features/connector.feature).
// Netrunner as an orchestrator of MCP servers.

describe('conectores de dominio como plugins', () => {
  it('registra un conector (AC-1/2)', () => {
    const registry = new ToolRegistry()
    const connector: Connector = {
      id: 'postgres',
      tools: [{
        id: 'postgres.query',
        description: 'ejecuta una query',
        family: 'op',
        readOnly: true,
        capabilities: ['ops'],
        inputSchema: { sql: { type: 'string' } },
        execute: async () => ({ rows: [] }),
      }],
    }

    registerConnector(registry, connector)

    expect(registry.listIds()).toContain('postgres.query')
  })

  it('duplicado → error (AC-4)', () => {
    const registry = new ToolRegistry()
    const connector: Connector = {
      id: 'postgres',
      tools: [{
        id: 'postgres.query',
        description: 'ejecuta una query',
        family: 'op',
        readOnly: true,
        capabilities: ['ops'],
        inputSchema: {},
        execute: async () => ({}),
      }],
    }

    registerConnector(registry, connector)
    expect(() => registerConnector(registry, connector)).toThrow(/already registered/i)
  })

  it('sin conectores → registry intacto (AC-3)', () => {
    const registry = new ToolRegistry()
    expect(registry.listIds()).toEqual([])
  })
})
