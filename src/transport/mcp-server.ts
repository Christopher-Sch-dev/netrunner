/**
 * rol: Servidor MCP de Netrunner (AC-3 vista MCP, AC-9 progressive disclosure).
 * Expone el contrato de tools (src/core) como un servidor MCP consumible por
 * CUALQUIER agente (Claude/Codex/Hermes/OpenCode/Cursor/MCP). Spec MCP 2026-07-28.
 *
 * DIFERENCIADOR DE TOKENS (AC-9, progressive disclosure): NO expone todas las
 * tools de golpe. Expone solo META-tools al conectar, y al habilitar un toolset
 * (derivado del stack del proyecto) registra dinámicamente sus tools. El agente
 * no ve 500 tools → no quema >400k tokens en schemas.
 *
 * CONTRATO ÚNICO (DEC-005 §3, cierra desvío del auditor): esta vista NO
 * reimplementa handlers. Proyecta el ToolRegistry central (buildNetrunnerRegistry):
 * cada ToolSpec se traduce a un registerTool del SDK MCP, y el execute delega en
 * registry.call(id, input, ctx). Si se agrega una tool al contrato, aparece sola.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que se conecta a un proyecto Netrunner,
 *   quiero descubrir y habilitar SOLO los toolsets relevantes al stack,
 *   para no pagar tokens por tools que no necesito.
 *
 * AC:
 *   AC-M1 al conectar expongo meta-tools: net_available_toolsets, net_enable_toolset.
 *   AC-M2 net_enable_toolset registra dinámicamente las tools del toolset (stack).
 *   AC-M3 idempotente: habilitar el mismo toolset dos veces no duplica.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { detectStack } from '../context/detect'
import { buildNetrunnerRegistry } from '../core/registry-factory'
import { toolsetsForStack, STACK_TOOLSETS } from './toolsets'
import { registerMetaResources } from './mcp-resources'
import type { ToolRegistry, ToolSpec, ToolContext } from '../core/registry'

/** Un toolset: grupo de tools activadas por stack del proyecto (determinista). */
interface Toolset {
  id: string
  description: string
}

/** Descripciones de los toolsets (para la vista MCP). */
const TOOLSET_DESCRIPTIONS: Record<string, string> = {
  graph: 'Grafo de conocimiento del proyecto (explore/callers/callees/impact)',
  stack: 'Información del stack detectado del proyecto',
  ops: 'Operaciones deterministas del proyecto (test/build/lint)',
}

/** rol: decide qué toolsets están disponibles según el stack (matriz declarativa). */
export function toolsetsFor(stack: { language: string; framework: string }): Toolset[] {
  const ids = toolsetsForStack(stack)
  return ids.map((id) => ({ id, description: TOOLSET_DESCRIPTIONS[id] ?? id }))
}

/** rol: mapea una family del contrato al id de toolset que la proyecta. */
function familyToToolset(family: string): string | null {
  if (family === 'graph') return 'graph'
  if (family === 'read') return 'stack' // stack.info es family 'read'
  if (family === 'op' || family === 'build' || family === 'test') return 'ops'
  return null
}

/** rol: convierte un ToolSpec a un registro MCP y delega el execute en el registry. */
function registerSpec(server: McpServer, registry: ToolRegistry, spec: ToolSpec, ctx: ToolContext): void {
  // id "graph.explore" → "explore"; id "stack.info" → "stack" (proyección del contrato)
  const toolName = spec.id.startsWith('stack.') ? 'stack' : spec.id.split('.')[1] ?? spec.id
  const inputSchema = Object.fromEntries(Object.entries(spec.inputSchema).map(([k, v]) => [k, vToZod(v)]))
  server.registerTool(
    `net_${toolName}`,
    {
      description: spec.description,
      inputSchema,
    },
    async (input) => {
      const result = await registry.call(spec.id, input as Record<string, unknown>, ctx)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    },
  )
}

/** rol: convierte un JSON Schema primitivo a schema zod (compatible con el SDK MCP). */
function vToZod(v: unknown): z.ZodType {
  if (v && typeof v === 'object' && 'type' in v) {
    const t = (v as { type: string }).type
    if (t === 'string') return z.string()
    if (t === 'integer' || t === 'number') return z.number()
    if (t === 'boolean') return z.boolean()
  }
  return z.any()
}

/**
 * rol: construye el McpServer proyectando el registry (testable).
 * projectDir es el proyecto a operar. Expone progressive disclosure.
 */
export async function createServer(projectDir: string): Promise<McpServer> {
  const server = new McpServer({ name: 'netrunner', version: '0.3.1' })
  const registry = buildNetrunnerRegistry()
  const stack = await detectStack(projectDir)
  const available = toolsetsFor(stack)
  const enabled = new Set<string>()
  const ctx: ToolContext = { projectDir, secrets: {}, profile: 'explore' }

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

  // --- META-TOOL: habilita un toolset, proyectando sus tools desde el registry ---
  server.registerTool(
    'net_enable_toolset',
    {
      description: 'Habilita un toolset del proyecto, registrando dinámicamente sus tools. Idempotente.',
      inputSchema: { toolset: z.enum(STACK_TOOLSETS.flatMap((r) => r.toolsets) as [string, ...string[]]) },
    },
    async ({ toolset }) => {
      if (!available.some((t) => t.id === toolset)) {
        return { content: [{ type: 'text' as const, text: `toolset '${toolset}' no disponible para este stack` }] }
      }
      if (enabled.has(toolset)) {
        return { content: [{ type: 'text' as const, text: `toolset '${toolset}' ya estaba habilitado` }] }
      }
      enabled.add(toolset)
      // proyección: registra las tools del registry cuya family matchea el toolset
      for (const spec of registry.discover('explore')) {
        if (familyToToolset(spec.family) === toolset) {
          registerSpec(server, registry, spec, ctx)
        }
      }
      return { content: [{ type: 'text' as const, text: `toolset '${toolset}' habilitado` }] }
    },
  )

  // expone el snapshot del proyecto como recursos MCP (net://meta/*, Wave 5)
  registerMetaResources(server, projectDir)

  return server
}

/** rol: arranca el servidor MCP por stdio (entrypoint real del binario). */
export async function serveMCP(projectDir: string): Promise<void> {
  const server = await createServer(projectDir)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Bug B: mantener el proceso vivo escuchando stdin (connect() resuelve y el
  // proceso saldría con exit 0 sin responder al initialize). El transport stdio
  // necesita que el event loop quede activo.
  await new Promise<void>(() => {}) // nunca resuelve → el proceso queda vivo
}
