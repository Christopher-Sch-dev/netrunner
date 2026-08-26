/**
 * rol: Construye el ToolRegistry central de Netrunner con todas las tools registradas.
 * Este registry es la FUENTE ÚNICA de handlers: las 4 vistas (MCP/ACP/Plugin/CLI)
 * lo proyectan, no reimplementan la lógica. (DEC-005 §3, cierra el desvío del auditor.)
 *
 * SPEC (Mandamiento 0):
 *   Como netrunner, quiero que el registry contenga todas las tools del motor,
 *   para que cualquier vista proyecte el mismo contrato sin duplicar.
 */
import { ToolRegistry } from './registry'
import { graphAndStackTools } from '../tools/index'

/** rol: registra todas las tools y devuelve el ToolRegistry listo. */
export function buildNetrunnerRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  for (const tool of graphAndStackTools()) {
    registry.register(tool)
  }
  return registry
}
