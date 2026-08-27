import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { install } from '../src/install'

// rol: tests de netrunner install (AC-1..5 de features/install.feature, DEC-006).

describe('netrunner install', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-install-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('instala SKILL.md (Agent Skills format) + wiring MCP default (AC-1/2)', async () => {
    const result = await install('mcp', dir)

    const skillPath = join(dir, '.netrunner', 'skills', 'netrunner', 'SKILL.md')
    expect(existsSync(skillPath)).toBe(true)
    const skill = readFileSync(skillPath, 'utf8')
    // formato Agent Skills: frontmatter name + description
    expect(skill).toContain('name: netrunner')
    expect(skill).toContain('description:')

    // wiring MCP en .mcp.json
    const mcpPath = join(dir, '.mcp.json')
    expect(existsSync(mcpPath)).toBe(true)
    const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
    expect(mcp.mcpServers.netrunner).toBeDefined()
    expect(mcp.mcpServers.netrunner.command).toContain('netrunner')
    expect(mcp.mcpServers.netrunner.args).toContain('--mcp')

    // TOON output
    expect(result.written).toContain('SKILL.md')
  })

  it('idempotente: re-ejecutar no duplica (AC-3)', async () => {
    await install('mcp', dir)
    const first = readFileSync(join(dir, '.mcp.json'), 'utf8')
    await install('mcp', dir)
    const second = readFileSync(join(dir, '.mcp.json'), 'utf8')
    expect(second).toBe(first) // actualiza en-place, no duplica
  })

  it('target inválido → error (AC-5)', async () => {
    expect(() => install('nope', dir)).toThrow(/target/i)
  })

  it('matrix de targets (w4a2): escribe config MCP por cada agente', async () => {
    const targets = ['mcp', 'opencode', 'claude', 'cursor', 'codex', 'gemini', 'hermes']
    for (const t of targets) {
      const r = await install(t, dir)
      expect(r.written).toContain('SKILL.md')
      // r.mcpConfig ya es ruta absoluta; verifico que existe
      expect(existsSync(r.mcpConfig)).toBe(true)
    }
  })
})
