/**
 * rol: Conectores de dominio como plugins (Juez 1 — Netrunner como orquestador de MCP servers).
 * Un conector de dominio (DB, cloud, SaaS) se registra como un set de tools en el
 * ToolRegistry. Así Netrunner orquesta todos los MCP servers, no compite con ellos.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que los conectores de dominio se registren como plugins,
 *   para que Netrunner sea el orquestador de todos los MCP servers.
 *
 * AC (features/connector.feature):
 *   AC-1 registerConnector registra las tools del conector.
 *   AC-2 un conector declara { id, tools: ToolSpec[] }.
 *   AC-3 sin conectores → registry intacto.
 *   AC-4 duplicado → error.
 */
import type { ToolRegistry, ToolSpec } from '../core/registry'

/** Un conector de dominio (DB, cloud, SaaS). */
export interface Connector {
  id: string
  tools: ToolSpec[]
}

/** rol: registra un conector en el registry (AC-1..4). */
export function registerConnector(registry: ToolRegistry, connector: Connector): void {
  for (const tool of connector.tools) {
    registry.register(tool) // lanza si el id ya existe (AC-4)
  }
}
