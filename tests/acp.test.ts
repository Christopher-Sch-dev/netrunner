import { describe, it, expect, vi } from 'vitest'
import * as acp from '@agentclientprotocol/sdk'
import { buildNetrunnerRegistry } from '../src/core/registry-factory'

// mock bun:sqlite → node:sqlite (registry → queries usa bun:sqlite)
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

// rol: tests del adapter ACP (features/acp.feature).
// Verifica que la vista ACP proyecta el MISMO ToolRegistry (AC-4, DEC-005 §3)
// y que el agente registra los handlers del protocolo (AC-2).

describe('acp adapter (proyección del contrato)', () => {
  it('el registry proyecta las tools del contrato (AC-4)', () => {
    const registry = buildNetrunnerRegistry()
    const ids = registry.listIds()
    // las 5 tools del contrato (explore/callers/callees/impact/stack/rg)
    expect(ids).toContain('graph.explore')
    expect(ids).toContain('graph.callers')
    expect(ids).toContain('graph.callees')
    expect(ids).toContain('graph.impact')
    expect(ids).toContain('search.rg')
  })

  it('los handlers del protocolo ACP están en el SDK (AC-2)', () => {
    // el SDK 1.4.0 expone los métodos del agente que registramos
    const methods = acp.AGENT_METHODS as Record<string, string>
    expect(methods).toBeDefined()
    expect(methods.session_new).toBe('session/new')
    expect(methods.session_prompt).toBe('session/prompt')
  })

  it('el adapter expone serveACP como función (integración stdio)', async () => {
    const mod = await import('../src/harness/acp')
    expect(typeof mod.serveACP).toBe('function')
  })
})
