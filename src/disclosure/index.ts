/**
 * rol: progressive disclosure por framework (features/disclosure.feature).
 * LA VISION (Netdeck): RAM finita — el agente no paga tokens por tools que no
 * aplican. El deck expone SOLO las tools relevantes al framework del proyecto.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el deck exponga solo las tools relevantes al framework,
 *   para no pagar tokens por tools que no aplican.
 *
 * AC (features/disclosure.feature):
 *   AC-1 disclosureFor(stack) → tools relevantes al framework.
 *   AC-2 framework desconocido → tools base (graph/read).
 *   AC-4 determinista.
 */

/** Stack mínimo para el disclosure. */
export interface DisclosureStack { language: string; framework: string }

/** Tools base (siempre disponibles, AC-2). */
const BASE_TOOLS = ['graph.explore', 'graph.callers', 'stack.info', 'search.rg']

/** Mapeo framework → tools extra (AC-1). */
const FRAMEWORK_TOOLS: Record<string, string[]> = {
  react: ['ops.build', 'ops.test', 'graph.impact'],
  node: ['ops.test', 'ops.build'],
  next: ['ops.build', 'ops.test'],
  astro: ['ops.build', 'ops.test'],
  vue: ['ops.build', 'ops.test'],
  svelte: ['ops.build', 'ops.test'],
  go: ['ops.test', 'ops.build'],
  rust: ['ops.test', 'ops.build'],
  python: ['ops.test'],
}

/** rol: tools relevantes al framework (AC-1/2/4). */
export function disclosureFor(stack: DisclosureStack): string[] {
  const extra = FRAMEWORK_TOOLS[stack.framework.toLowerCase()] ?? []
  return [...BASE_TOOLS, ...extra]
}
