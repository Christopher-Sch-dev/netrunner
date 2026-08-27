/**
 * rol: handler CLI del orquestador MCP real (Wave E1) — `netrunner mcp-orchestrate`.
 * Descubre servers MCP del proyecto (.mcp.json), los conecta como CLIENTE, y lista
 * servers + tools agregadas como un solo contrato (JSON estable, exit 0).
 *
 * SPEC: ver src/mcp-orchestrate/SPEC.md (AC-6).
 */
import type { HandlerContext } from './types'

/** rol: `mcp-orchestrate` — lista servers descubiertos + tools agregadas (AC-6). */
export async function orchestrate(ctx: HandlerContext): Promise<void> {
  const { discoverServers, McpOrchestrator } = await import('../../mcp-orchestrate/index')
  const configs = discoverServers(ctx.projectDir)
  const orch = new McpOrchestrator()
  const servers = await orch.connectAll(configs)
  const tools = orch.listTools()
  await orch.close()
  ctx.emit({ servers, tools }, ctx.human)
  process.exit(0)
}
