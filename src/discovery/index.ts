/**
 * rol: Auto-descubrimiento de Netrunner (Wave B, gap real #1 del validador).
 * Permite que el agente descubra exactamente qué tools/parámetros puede operar
 * sin adivinar: `dumpContract` imprime el contrato completo (tools/toolsets/
 * capabilities), `toolHelp` imprime el inputSchema de una tool. Output JSON
 * limpio, determinista (AC-14 ai-native-cli).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero descubrir exactamente qué tools/parámetros puedo operar,
 *   para que el agente sepa qué puede hacer sin adivinar.
 *
 * AC (features/discovery.feature):
 *   AC-1 dumpContract(registry) → { tools, toolsets, capabilities }.
 *   AC-2 net_list_tools (MCP) → catálogo de tools del toolset.
 *   AC-3 toolHelp(registry, id) → inputSchema de la tool.
 *   AC-4 tool desconocida → error.
 */
import type { ToolRegistry } from '../core/registry'

/** Tool del contrato (sin el handler — solo metadata para el agente). */
export interface ContractTool {
  id: string
  description: string
  family: string
  readOnly: boolean
  capabilities: string[]
  schema: Record<string, unknown>
}

/** Contrato completo del motor. */
export interface Contract {
  tools: ContractTool[]
  toolsets: string[]
  capabilities: string[]
}

/** rol: imprime el contrato completo (AC-1). */
export function dumpContract(registry: ToolRegistry): Contract {
  const tools: ContractTool[] = registry.listIds().map((id) => {
    const spec = registry.get(id)
    if (!spec) throw new Error(`unknown tool: '${id}'`)
    return {
      id: spec.id,
      description: spec.description,
      family: spec.family,
      readOnly: spec.readOnly,
      capabilities: spec.capabilities,
      schema: spec.inputSchema,
    }
  })
  const capabilities = [...new Set(tools.flatMap((t) => t.capabilities))]
  const toolsets = ['graph', 'stack', 'ops']
  return { tools, toolsets, capabilities }
}

/** rol: imprime el inputSchema de una tool (AC-3/4). */
export function toolHelp(registry: ToolRegistry, id: string): { id: string; schema: Record<string, unknown> } {
  const spec = registry.get(id)
  if (!spec) throw new Error(`unknown tool: '${id}'`)
  return { id: spec.id, schema: spec.inputSchema }
}
