import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// role: tests for the real MCP orchestrator (Wave E1).
// Uses a REAL MCP server spawned over stdio (StdioClientTransport) — not a mock —
// to prove the orchestrator connects servers as a CLIENT and aggregates their tools.

// Path to the repo's @modelcontextprotocol/sdk so the temp server can import it.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const sdkMcp = join(repoRoot, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'server', 'mcp.js')
const sdkStdio = join(repoRoot, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'server', 'stdio.js')
const zodPath = join(repoRoot, 'node_modules', 'zod', 'index.js')

/** rol: escribe un server MCP real (stdio) en dir que expone la tool "echo". */
function writeEchoServer(dir: string): string {
  const serverFile = join(dir, 'echo-server.mjs')
  const code = `
import { McpServer } from ${JSON.stringify(sdkMcp)};
import { StdioServerTransport } from ${JSON.stringify(sdkStdio)};
import { z } from ${JSON.stringify(zodPath)};
const server = new McpServer({ name: 'echo-server', version: '1.0.0' });
server.registerTool('echo', { description: 'devuelve el texto', inputSchema: { text: z.string() } }, async ({ text }) => ({ content: [{ type: 'text', text: 'echo:' + text }] }));
const transport = new StdioServerTransport();
await server.connect(transport);
await new Promise(() => {});
`
  writeFileSync(serverFile, code)
  return serverFile
}

describe('mcp-orchestrate (orquestador MCP real)', () => {
  let dir: string
  let serverFile: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-orch-'))
    serverFile = writeEchoServer(dir)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('discoverServers: lee .mcp.json y devuelve las configs (AC-1)', async () => {
    const { discoverServers } = await import('../src/mcp-orchestrate/index')
    writeFileSync(
      join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { a: { command: 'node', args: ['a.js'] }, b: { command: 'node', args: ['b.js'] } } }),
    )
    const servers = discoverServers(dir)
    expect(servers).toHaveLength(2)
    expect(servers[0]).toMatchObject({ name: 'a', command: 'node', args: ['a.js'] })
    expect(servers[1]).toMatchObject({ name: 'b' })
  })

  it('discoverServers: sin .mcp.json devuelve [] (AC-1)', async () => {
    const { discoverServers } = await import('../src/mcp-orchestrate/index')
    expect(discoverServers(dir)).toEqual([])
  })

  it('conecta un server MCP real por stdio y agrega sus tools con prefijo (AC-2/3)', async () => {
    const { McpOrchestrator } = await import('../src/mcp-orchestrate/index')
    const orch = new McpOrchestrator()
    const states = await orch.connectAll([
      { name: 'echo', command: 'node', args: [serverFile] },
    ])
    expect(states[0].connected).toBe(true)
    expect(states[0].error).toBeUndefined()

    const tools = orch.listTools()
    expect(tools.some((t) => t.id === 'echo.echo')).toBe(true)
    await orch.close()
  })

  it('callTool delega al server correcto y devuelve el resultado (AC-4)', async () => {
    const { McpOrchestrator } = await import('../src/mcp-orchestrate/index')
    const orch = new McpOrchestrator()
    await orch.connectAll([{ name: 'echo', command: 'node', args: [serverFile] }])

    const result = await orch.callTool('echo.echo', { text: 'hola' })
    expect(JSON.stringify(result)).toContain('echo:hola')
    await orch.close()
  })

  it('callTool con id desconocido lanza error (AC-4)', async () => {
    const { McpOrchestrator } = await import('../src/mcp-orchestrate/index')
    const orch = new McpOrchestrator()
    await orch.connectAll([{ name: 'echo', command: 'node', args: [serverFile] }])
    await expect(orch.callTool('noexiste.tool', {})).rejects.toThrow(/unknown|no existe/i)
    await orch.close()
  })

  it('server que falla al conectar se reporta con error, no rompe el resto (AC-2)', async () => {
    const { McpOrchestrator } = await import('../src/mcp-orchestrate/index')
    const orch = new McpOrchestrator()
    const states = await orch.connectAll([
      { name: 'echo', command: 'node', args: [serverFile] },
      { name: 'roto', command: 'node', args: ['/no/existe.js'] },
    ])
    expect(states[0].connected).toBe(true)
    expect(states[1].connected).toBe(false)
    expect(states[1].error).toBeTruthy()
    // el server bueno sigue agregando sus tools
    expect(orch.listTools().some((t) => t.id === 'echo.echo')).toBe(true)
    await orch.close()
  })

  it('CLI mcp-orchestrate lista servers y tools agregadas (AC-6)', async () => {
    const { main } = await import('../src/cli')
    writeFileSync(
      join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { echo: { command: 'node', args: [serverFile] } } }),
    )
    const logged: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logged.push(String(s)) })
    const realExit = process.exit
    ;(process as unknown as { exit: (c?: number) => never }).exit = ((code?: number) => {
      throw new Error(`__EXIT__${code ?? 0}`)
    }) as never
    try {
      await main(['mcp-orchestrate', '--dir', dir])
    } catch (e) {
      if (!(e instanceof Error && e.message.startsWith('__EXIT__'))) throw e
    } finally {
      spy.mockRestore()
      ;(process as unknown as { exit: (c?: number) => never }).exit = realExit
    }
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    const parsed = JSON.parse(json!)
    expect(parsed.servers).toBeDefined()
    expect(parsed.servers[0].name).toBe('echo')
    expect(parsed.tools.some((t: { id: string }) => t.id === 'echo.echo')).toBe(true)
  })
})
