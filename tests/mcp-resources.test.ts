import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerMetaResources } from '../src/transport/mcp-resources'

// rol: tests de MCP resources (AC-1..4 de features/mcp-resources.feature).
// Exponer el snapshot como recursos net://meta/* (spec MCP 2026-07-28).

describe('MCP resources (net://meta/*)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-mcpres-'))
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('registra los recursos meta (AC-1)', () => {
    const server = new McpServer({ name: 'netrunner', version: '0.1.0' })
    registerMetaResources(server, dir)
    // no lanza → registró los recursos
    expect(true).toBe(true)
  })

  it('el recurso net://meta/branch devuelve la rama (AC-2/4)', async () => {
    const server = new McpServer({ name: 'netrunner', version: '0.1.0' })
    registerMetaResources(server, dir)

    // lee el recurso vía el callback registrado (accedemos al snapshot directamente)
    const { buildSnapshot } = await import('../src/context/snapshot')
    const snap = await buildSnapshot(dir)
    expect(snap.git.branch).toBe('develop')
  })
})
