/**
 * rol: Matriz stack→toolsets DECLARATIVA (P0-4 del validador de scope).
 * Reemplaza el hardcode de TOOLSETS en mcp-server: cada stack del proyecto activa
 * los toolsets correctos de forma determinista y extensible. Agregar una fila
 * activa toolsets sin tocar mcp-server (progressive disclosure por contexto).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que la matriz stack→toolsets sea declarativa,
 *   para que cada stack active los toolsets correctos de forma determinista.
 *
 * AC (features/toolsets.feature):
 *   AC-1 STACK_TOOLSETS es declarativa: { stack, toolsets }.
 *   AC-2 toolsetsForStack(stack) devuelve los toolsets activados (determinista).
 *   AC-3 TS activa graph+stack+ops; python activa graph+stack.
 *   AC-4 extensible sin tocar mcp-server.
 */

/** Fila declarativa: qué stacks activan qué toolsets. */
export interface StackToolsetRow {
  stack: string[]
  toolsets: string[]
}

/** Matriz declarativa (fuente única de la diversificación por stack). */
export const STACK_TOOLSETS: StackToolsetRow[] = [
  { stack: ['typescript', 'javascript', 'tsx', 'jsx'], toolsets: ['graph', 'stack', 'ops'] },
  { stack: ['python'], toolsets: ['graph', 'stack'] },
  { stack: ['go', 'rust'], toolsets: ['graph', 'stack'] },
  { stack: ['unknown'], toolsets: ['graph', 'stack'] },
]

/** rol: devuelve los toolsets activados por el stack (determinista, AC-2). */
export function toolsetsForStack(stack: { language: string; framework: string }): string[] {
  const lang = stack.language?.toLowerCase() ?? 'unknown'
  const fw = stack.framework?.toLowerCase() ?? ''
  const row = STACK_TOOLSETS.find(
    (r) => r.stack.includes(lang) || r.stack.includes(fw),
  ) ?? STACK_TOOLSETS[STACK_TOOLSETS.length - 1] // fallback: unknown
  return [...row.toolsets]
}
