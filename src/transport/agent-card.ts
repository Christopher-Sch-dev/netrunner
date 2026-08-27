/**
 * rol: Genera el Agent Card A2A v1.0 de NetRunner (W4.E4.1, features/a2a.feature AC-1/AC-2).
 * Proyecta el ToolRegistry central (buildNetrunnerRegistry) como un Agent Card:
 * cada tool del contrato → un AgentSkill (id/name/description/tags). No duplica
 * handlers (DEC-005 §3): si se agrega una tool al contrato, aparece sola en el card.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente A2A remoto,
 *   quiero descubrir las capacidades de NetRunner vía su Agent Card,
 *   para delegarle tareas sabiendo qué skills (tools) soporta.
 *
 * AC (features/a2a.feature):
 *   AC-1 buildAgentCard genera un AgentCard A2A v1.0 válido (name/description/version/
 *        supportedInterfaces JSONRPC 1.0/capabilities/defaultInputModes/OutputModes/skills).
 *   AC-2 cada tool del registry se proyecta a un AgentSkill (id/name/description/tags).
 */
import type { ToolRegistry, ToolSpec } from '../core/registry'
import type { AgentCard, AgentSkill, AgentInterface, AgentCapabilities } from '@a2a-js/sdk'

/** Opciones para construir el Agent Card. */
export interface AgentCardOptions {
  /** directorio del proyecto operado (para el contexto de las tools). */
  projectDir: string
  /** versión del agente (default: versión de NetRunner). */
  version?: string
  /** url de la interfaz (default: stdio://netrunner — T0, binario standalone). */
  url?: string
}

/** rol: mapea una family del contrato a tags del skill (progressive disclosure). */
function familyTags(family: string): string[] {
  if (family === 'graph') return ['graph', 'knowledge']
  if (family === 'read') return ['stack', 'read']
  if (family === 'op' || family === 'build' || family === 'test') return ['ops', 'deterministic']
  if (family === 'config') return ['config']
  return [family]
}

/** rol: proyecta un ToolSpec a un AgentSkill A2A (id/name/description/tags). */
function specToSkill(spec: ToolSpec): AgentSkill {
  return {
    id: spec.id,
    name: spec.id,
    description: spec.description,
    tags: [...familyTags(spec.family), ...spec.capabilities],
    examples: [],
    inputModes: ['text/plain'],
    outputModes: ['application/json'],
    securityRequirements: [],
  }
}

/**
 * rol: construye el Agent Card A2A v1.0 proyectando el registry (testable).
 * Cada tool del contrato → un AgentSkill. La interfaz es JSONRPC protocolVersion 1.0.
 */
export function buildAgentCard(registry: ToolRegistry, opts: AgentCardOptions): AgentCard {
  const version = opts.version ?? '0.3.1'
  const url = opts.url ?? 'stdio://netrunner'

  const interfaces: AgentInterface[] = [
    { url, protocolBinding: 'JSONRPC', tenant: '', protocolVersion: '1.0' },
  ]

  const capabilities: AgentCapabilities = {
    streaming: false,
    pushNotifications: false,
    extensions: [],
    extendedAgentCard: false,
  }

  const skills: AgentSkill[] = registry
    .listIds()
    .map((id) => registry.get(id))
    .filter((s): s is ToolSpec => s !== undefined)
    .map(specToSkill)

  return {
    name: 'netrunner',
    description: 'Universal agent SDK — plug any project into any agent. Expone las tools del contrato (grafo, stack, ops) como skills A2A para que otros agentes le deleguen tareas.',
    supportedInterfaces: interfaces,
    provider: { url: 'https://github.com/Christopher-Sch-dev/netrunner', organization: 'NetRunner' },
    version,
    capabilities,
    securitySchemes: {},
    securityRequirements: [],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['application/json'],
    skills,
    signatures: [],
  }
}
