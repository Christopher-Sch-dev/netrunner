import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generatePlugin } from '../src/plugin/generate'

// role: tests for the Agent Plugin generator (AC-1..4 of features/plugin.feature).

describe('Agent Plugin generator', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-plugin-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('genera plugin.json Agent Plugins 1.0.0 + skills + mcp.json (AC-1/2/3)', () => {
    const r = generatePlugin('netrunner-demo', '1.0.0', dir)

    const pluginPath = join(dir, '.netrunner', 'plugin', 'plugin.json')
    expect(existsSync(pluginPath)).toBe(true)
    const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'))
    expect(plugin.$schema).toContain('agent-plugins.org/schemas/1.0.0')
    expect(plugin.name).toBe('netrunner-demo')
    expect(plugin.version).toBe('1.0.0')

    // skills + mcp
    expect(existsSync(join(dir, '.netrunner', 'plugin', 'skills', 'netrunner', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(dir, '.netrunner', 'plugin', 'mcp.json'))).toBe(true)

    expect(r.written).toContain('plugin.json')
  })

  it('idempotente: re-generar no duplica (AC-4)', () => {
    generatePlugin('x', '1.0.0', dir)
    const first = readFileSync(join(dir, '.netrunner', 'plugin', 'plugin.json'), 'utf8')
    generatePlugin('x', '1.0.0', dir)
    const second = readFileSync(join(dir, '.netrunner', 'plugin', 'plugin.json'), 'utf8')
    expect(second).toBe(first)
  })
})
