/**
 * rol: Servidor MCP de Netrunner (AC-3 vista MCP, AC-9 progressive disclosure).
 * Expone el contrato de tools (src/core) como un servidor MCP consumible por
 * CUALQUIER agente (Claude/Codex/Hermes/OpenCode/Cursor/MCP). Spec MCP 2026-07-28.
 *
 * DIFERENCIADOR DE TOKENS (AC-9, progressive disclosure): NO expone todas las
 * tools de golpe. Expone solo META-tools al conectar, y al habilitar un toolset
 * (derivado del stack del proyecto) registra dinámicamente sus tools. El agente
 * no ve 500 tools → no quema >400k tokens en schemas. (evidencia: 85-100x
 * ahorro tokens, +9-25pt precisión — auditoría 2026-08-26 extensibilidad.)
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que se conecta a un proyecto Netrunner,
 *   quiero descubrir y habilitar SOLO los toolsets relevantes al stack del proyecto,
 *   para no pagar tokens por tools que no necesito y responder más rápido.
 *
 * AC:
 *   AC-M1 al conectar expongo meta-tools: net_available_toolsets, net_enable_toolset.
 *   AC-M2 net_enable_toolset registra dinámicamente las tools del toolset (stack).
 *   AC-M3 idempotente: habilitar el mismo toolset dos veces no duplica tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { detectStack } from '../context/detect'
import { explore, callers, callees, impact } from '../context/queries'

/** Un toolset: grupo de tools activadas por stack del proyecto (determinista). */
interface Toolset {
  id: string
  description: string
  /** stack.language o stack.framework que activa este toolset. */
  triggers: string[]
}

/** Catálogo determinista de toolsets (extensible: se agregan plugins por stack). */
const TOOLSETS: Toolset[] = [
  {
    id: 'graph',
    description: 'Grafo de conocimiento del proyecto (explore/callers/callees/impact)',
    triggers: ['typescript', 'javascript', 'python', 'go', 'rust', 'unknown'],
  },
  {
    id: 'stack',
    description: 'Información del stack detectado del proyecto',
    triggers: ['typescript', 'javascript', 'python', 'go', 'rust', 'unknown'],
  },
]

/** rol: decide qué toolsets están disponibles para un proyecto según su stack (determinista). */
export function toolsetsFor(stack: { language: string; framework: string }): Toolset[] {
  return TOOLSETS.filter((t) => t.triggers.includes(stack.language) || t.triggers.includes(stack.framework))
}

/**
 * rol: construye el McpServer (testable). projectDir es el proyecto a operar.
 * Exponer progressive disclosure: meta-tools + enable_toolset que registra dinámico.
 */
export async function createServer(projectDir: string): Promise<McpServer> {
  const server = new McpServer({ name: 'netrunner', version: '0.1.0' })
  const stack = await detectStack(projectDir)
  const available = toolsetsFor(stack)
  const enabled = new Set<string>()

  // --- META-TOOL: lista toolsets disponibles (por stack del proyecto) ---
  server.registerTool(
    'net_available_toolsets',
    {
      description: 'Lista los toolsets disponibles para este proyecto (derivados de su stack).',
      inputSchema: {},
    },
    async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify(available.map((t) => ({ id: t.id, description: t.description }))) }],
    }),
  )

  // --- META-TOOL: habilita un toolset, registrando sus tools dinámicamente ---
  server.registerTool(
    'net_enable_toolset',
    {
      description: 'Habilita un toolset del proyecto, registrando dinámicamente sus tools. Idempotente.',
      inputSchema: { toolset: z.enum(TOOLSETS.map((t) => t.id) as [string, ...string[]]) },
    },
    async ({ toolset }) => {
      if (!available.some((t) => t.id === toolset)) {
        return { content: [{ type: 'text' as const, text: `toolset '${toolset}' no disponible para este stack` }] }
      }
      if (enabled.has(toolset)) {
        return { content: [{ type: 'text' as const, text: `toolset '${toolset}' ya estaba habilitado` }] }
      }
      enabled.add(toolset)
      registerToolsetTools(server, toolset, projectDir)
      return { content: [{ type: 'text' as const, text: `toolset '${toolset}' habilitado` }] }
    },
  )

  return server
}

/** rol: arranca el servidor MCP por stdio (entrypoint real del binario). */
export async function serveMCP(projectDir: string): Promise<void> {
  const server = await createServer(projectDir)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

/** rol: registra las tools reales de un toolset en el server MCP (dinámico). */
function registerToolsetTools(server: McpServer, toolset: string, projectDir: string): void {
  if (toolset === 'graph') {
    server.registerTool('net_explore', {
      description: 'Busca símbolos del proyecto por nombre.',
      inputSchema: { name: z.string() },
    }, async ({ name }) => {
      const r = await explore(name, projectDir)
      return { content: [{ type: 'text' as const, text: JSON.stringify(r) }] }
    })

    server.registerTool('net_callers', {
      description: 'Quiénes llaman a un símbolo.',
      inputSchema: { symbol: z.string() },
    }, async ({ symbol }) => {
      const r = await callers(symbol, projectDir)
      return { content: [{ type: 'text' as const, text: JSON.stringify(r) }] }
    })

    server.registerTool('net_callees', {
      description: 'A quién llama un símbolo.',
      inputSchema: { symbol: z.string() },
    }, async ({ symbol }) => {
      const r = await callees(symbol, projectDir)
      return { content: [{ type: 'text' as const, text: JSON.stringify(r) }] }
    })

    server.registerTool('net_impact', {
      description: 'Blast radius de un símbolo (BFS acotado).',
      inputSchema: { symbol: z.string(), depth: z.number().optional() },
    }, async ({ symbol, depth }) => {
      const r = await impact(symbol, projectDir, depth ?? 2)
      return { content: [{ type: 'text' as const, text: JSON.stringify(r) }] }
    })
  } else if (toolset === 'stack') {
    server.registerTool('net_stack', {
      description: 'Información del stack detectado del proyecto.',
      inputSchema: {},
    }, async () => {
      const stack = await detectStack(projectDir)
      return { content: [{ type: 'text' as const, text: JSON.stringify(stack) }] }
    })
  }
}
