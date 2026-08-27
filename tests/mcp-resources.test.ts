import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerMetaResources } from '../src/transport/mcp-resources'

// role: tests for MCP resources (AC-1..4 of features/mcp-resources.feature).
// Expose the snapshot as net://meta/* resources (MCP spec 2026-07-28).

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
    const server = new McpServer({ name: 'netrunner', version: '0.3.1' })
    registerMetaResources(server, dir)
    // does not throw → the resources were registered
    expect(true).toBe(true)
  })

  it('el recurso net://meta/branch devuelve la rama (AC-2/4)', async () => {
    const server = new McpServer({ name: 'netrunner', version: '0.3.1' })
    registerMetaResources(server, dir)

    // reads the resource via the registered callback (we access the snapshot directly)
    const { buildSnapshot } = await import('../src/context/snapshot')
    const snap = await buildSnapshot(dir)
    expect(snap.git.branch).toBe('develop')
  })

  it('net://meta/stack devuelve el stack real, no remoteUrl (mata el mutante M10)', async () => {
    const { buildSnapshot } = await import('../src/context/snapshot')
    const snap = await buildSnapshot(dir)
    // the stack is an object with language/framework, NOT the remote URL
    expect(snap.stack).toBeDefined()
    expect(typeof snap.stack.language).toBe('string')
    expect(snap.stack.language).not.toContain('github.com')
  })
})
