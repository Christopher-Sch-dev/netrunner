import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildAgentCard } from '../src/transport/agent-card'
import { buildNetrunnerRegistry } from '../src/core/registry-factory'

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

// role: A2A Agent Card conformance (W4.E4.1, features/a2a.feature AC-1/AC-2).
// El card proyecta las tools del ToolRegistry como AgentSkills (DEC-005 §3).

describe('agent-card (A2A v1.0)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-a2a-card-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const A = 1\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('AC-1: genera un AgentCard A2A v1.0 válido (name/description/version/interfaces/capabilities)', () => {
    const registry = buildNetrunnerRegistry()
    const card = buildAgentCard(registry, { projectDir: dir, version: '0.3.1' })

    expect(card.name).toBe('netrunner')
    expect(card.description.length).toBeGreaterThan(0)
    expect(card.version).toBe('0.3.1')
    expect(card.capabilities).toBeDefined()
    expect(card.capabilities?.streaming).toBe(false)
    expect(card.capabilities?.pushNotifications).toBe(false)
    // interface JSONRPC protocolVersion 1.0
    expect(card.supportedInterfaces.length).toBeGreaterThan(0)
    const iface = card.supportedInterfaces[0]
    expect(iface.protocolBinding).toBe('JSONRPC')
    expect(iface.protocolVersion).toBe('1.0')
    // default input/output modes
    expect(card.defaultInputModes).toContain('text/plain')
    expect(card.defaultOutputModes).toContain('application/json')
  })

  it('AC-2: cada tool del registry se proyecta a un AgentSkill (id/name/description/tags)', () => {
    const registry = buildNetrunnerRegistry()
    const card = buildAgentCard(registry, { projectDir: dir, version: '0.3.1' })

    const ids = card.skills.map((s) => s.id)
    // todas las tools del registry están como skills
    for (const id of registry.listIds()) {
      expect(ids).toContain(id)
    }
    // cada skill tiene name, description y tags no vacíos
    for (const skill of card.skills) {
      expect(skill.name.length).toBeGreaterThan(0)
      expect(skill.description.length).toBeGreaterThan(0)
      expect(skill.tags.length).toBeGreaterThan(0)
    }
    // la tool graph.explore está presente con su descripción del contrato
    const explore = card.skills.find((s) => s.id === 'graph.explore')
    expect(explore).toBeDefined()
    expect(explore?.description).toContain('símbolos')
  })

  it('AC-2b: skills únicos (no duplica tools)', () => {
    const registry = buildNetrunnerRegistry()
    const card = buildAgentCard(registry, { projectDir: dir, version: '0.3.1' })
    const ids = card.skills.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
