/**
 * rol: Tools del grafo de conocimiento de Netrunner como ToolSpec del contrato (AC-3).
 * Cada tool declara su spec (id/family/readOnly/capabilities/inputSchema) y su execute
 * usa el ToolContext inyectado (DI, nunca global). Estas specs son la FUENTE ÚNICA
 * de handlers: las 4 vistas (MCP/ACP/Plugin/CLI) las proyectan, no las reimplementan.
 * (DEC-005 §3 — un contrato, múltiples vistas; cierra el desvío del auditor.)
 *
 * SPEC (Mandamiento 0):
 *   Como netrunner, quiero definir las tools del grafo en el ToolRegistry central,
 *   para que cada vista proyecte el MISMO contrato sin duplicar la lógica.
 */
import type { ToolSpec, ToolContext } from '../core/registry'
import { explore, callers, callees, impact } from '../context/queries'
import { detectStack } from '../context/detect'
import { rgTool } from './rg'

/** rol: serializa el resultado a un objeto estable para la respuesta de la tool. */
function toText(result: unknown): { ok: true; data: unknown } {
  return { ok: true, data: result }
}

/** rol: spec de la tool explore (buscar símbolo por nombre). */
function exploreTool(): ToolSpec {
  return {
    id: 'graph.explore',
    description: 'Busca símbolos del proyecto por nombre (grafo de conocimiento).',
    family: 'graph',
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: { name: { type: 'string' } },
    execute: async (input, ctx) => toText(await explore(String(input.name), ctx.projectDir)),
  }
}

/** rol: spec de la tool callers (quién llama a un símbolo). */
function callersTool(): ToolSpec {
  return {
    id: 'graph.callers',
    description: 'Devuelve qué nodos llaman a un símbolo dado.',
    family: 'graph',
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: { symbol: { type: 'string' } },
    execute: async (input, ctx) => toText(await callers(String(input.symbol), ctx.projectDir)),
  }
}

/** rol: spec de la tool callees (a quién llama un símbolo). */
function calleesTool(): ToolSpec {
  return {
    id: 'graph.callees',
    description: 'Devuelve a qué nodos llama un símbolo dado.',
    family: 'graph',
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: { symbol: { type: 'string' } },
    execute: async (input, ctx) => toText(await callees(String(input.symbol), ctx.projectDir)),
  }
}

/** rol: spec de la tool impact (blast radius BFS). */
function impactTool(): ToolSpec {
  return {
    id: 'graph.impact',
    description: 'Devuelve el blast radius (impacto) de un símbolo, BFS acotado por depth.',
    family: 'graph',
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: { symbol: { type: 'string' }, depth: { type: 'integer', minimum: 0, default: 2 } },
    execute: async (input, ctx) => toText(await impact(String(input.symbol), ctx.projectDir, Number(input.depth ?? 2))),
  }
}

/** rol: spec de la tool stack (información del stack detectado). */
function stackTool(): ToolSpec {
  return {
    id: 'stack.info',
    description: 'Devuelve el stack del proyecto (lenguaje, framework, package manager).',
    family: 'read',
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: {},
    execute: async (_input, ctx) => toText(await detectStack(ctx.projectDir)),
  }
}

/** rol: devuelve el array completo de specs de las tools del grafo/stack/rg. */
export function graphAndStackTools(): ToolSpec[] {
  return [exploreTool(), callersTool(), calleesTool(), impactTool(), stackTool(), rgTool()]
}
