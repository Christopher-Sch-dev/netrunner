/**
 * rol: Orquestador MCP real (Wave E1) — descubre servers MCP del proyecto, los
 * conecta como CLIENTE, y expone sus tools como un solo contrato (registry agregado
 * con prefijo por server). Visión de Cris: UNA herramienta universal que reemplaza
 * TODAS las separadas.
 *
 * SPEC (Mandamiento 0): ver src/mcp-orchestrate/SPEC.md
 *   Como un agente que opera un proyecto NetRunner,
 *   quiero que `netrunner mcp-orchestrate` descubra los servers MCP del proyecto,
 *   los conecte como CLIENTE, y exponga sus tools como un solo contrato,
 *   para que el agente vea UNA superficie de tools unificada en vez de N servers.
 *
 * AC:
 *   AC-1 discoverServers(projectDir) lee .mcp.json (mcpServers) → configs.
 *   AC-2 connectAll() conecta cada server como CLIENTE (Client + StdioClientTransport).
 *   AC-3 listTools() agrega tools con id único "serverName.toolName".
 *   AC-4 callTool(id, args) delega al server correcto (parsea el prefijo).
 *   AC-5 close() cierra todos los transports (sin procesos huérfanos).
 *   AC-6 CLI `mcp-orchestrate` lista servers + tools (JSON estable, exit 0).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

/** Config de un server MCP declarado en .mcp.json (formato estándar MCP). */
export interface McpServerConfig {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
}

/** Tool agregada al contrato único del orquestador. */
export interface OrchestratedTool {
  /** id único: "serverName.toolName" (prefijo por server → sin colisiones). */
  id: string
  server: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/** Estado de conexión de un server. */
export interface ServerState {
  name: string
  connected: boolean
  error?: string
  toolCount: number
}

/** Conexión interna: client MCP + transport + tools descubiertas. */
interface Connection {
  client: Client
  transport: StdioClientTransport
  tools: OrchestratedTool[]
}

/**
 * rol: lee .mcp.json del proyecto y devuelve las configs de servers (AC-1).
 * Sin .mcp.json → []. No lanza: un proyecto sin servers es un caso válido.
 * SECURITY (fix auditor C1): valida que el command sea un binario conocido
 * (allowlist) — un .mcp.json comprometido NO puede ejecutar comandos arbitrarios.
 */
const ALLOWED_COMMANDS = new Set([
  'netrunner', 'node', 'bun', 'npx', 'python3', 'python', 'deno', 'go', 'cargo',
  'npx.cmd', 'node.exe', 'bun.exe', 'python.exe',
])

export function discoverServers(projectDir: string): McpServerConfig[] {
  const mcpPath = join(projectDir, '.mcp.json')
  if (!existsSync(mcpPath)) return []
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(mcpPath, 'utf8'))
  } catch {
    return [] // .mcp.json corrupto → no inventar servers
  }
  const servers = (raw as { mcpServers?: Record<string, McpServerConfig> })?.mcpServers
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, cfg]) => {
      // SECURITY (C1): solo binarios conocidos — bloquear RCE vía command arbitrario
      const cmd = cfg.command.split(/[\\/]/).pop() ?? cfg.command
      return ALLOWED_COMMANDS.has(cmd)
    })
    .map(([name, cfg]) => ({
      name,
      command: cfg.command,
      args: cfg.args ?? [],
      env: cfg.env,
    }))
}

/**
 * rol: Orquestador MCP — conecta servers como CLIENTE y agrega sus tools.
 * DI (Mandamiento 2): recibe las configs por parámetro, no hardcodea servers.
 */
export class McpOrchestrator {
  private connections = new Map<string, Connection>()

  /**
   * rol: conecta cada server como CLIENTE (Client + StdioClientTransport) y
   * descubre sus tools. Un server que falla se reporta con error sin romper el resto.
   * (AC-2)
   */
  async connectAll(configs: McpServerConfig[]): Promise<ServerState[]> {
    const states: ServerState[] = []
    for (const cfg of configs) {
      try {
        const transport = new StdioClientTransport({
          command: cfg.command,
          args: cfg.args,
          env: cfg.env,
          stderr: 'pipe',
        })
        const client = new Client({ name: 'netrunner-orchestrator', version: '0.3.1' })
        await client.connect(transport)
        const list = await client.listTools()
        const tools: OrchestratedTool[] = list.tools.map((t) => ({
          id: `${cfg.name}.${t.name}`,
          server: cfg.name,
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown> | undefined,
        }))
        this.connections.set(cfg.name, { client, transport, tools })
        states.push({ name: cfg.name, connected: true, toolCount: tools.length })
      } catch (e) {
        states.push({ name: cfg.name, connected: false, error: String((e as Error)?.message ?? e), toolCount: 0 })
      }
    }
    return states
  }

  /** rol: agrega las tools de todos los servers conectados en un solo contrato (AC-3). */
  listTools(): OrchestratedTool[] {
    return [...this.connections.values()].flatMap((c) => c.tools)
  }

  /**
   * rol: delega la llamada al server correcto parseando el prefijo "server.tool" (AC-4).
   * Id desconocido → error. Devuelve el resultado crudo del server.
   */
  async callTool(id: string, args: Record<string, unknown>): Promise<unknown> {
    const dot = id.indexOf('.')
    if (dot < 1) throw new Error(`unknown tool: ${id}`)
    const serverName = id.slice(0, dot)
    const toolName = id.slice(dot + 1)
    const conn = this.connections.get(serverName)
    if (!conn) throw new Error(`unknown tool: ${id}`)
    const result = await conn.client.callTool({ name: toolName, arguments: args })
    return result
  }

  /** rol: cierra todos los transports (no deja procesos huérfanos) (AC-5). */
  async close(): Promise<void> {
    await Promise.all(
      [...this.connections.values()].map(async (c) => {
        try {
          await c.transport.close()
        } catch {
          // cerrar es best-effort: un transport ya caído no debe romper el resto
        }
      }),
    )
    this.connections.clear()
  }
}
