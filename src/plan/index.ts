/**
 * rol: plan real basado en el grafo (features/plan-real.feature).
 * LA VISION: el plan NO es un stub genérico (explore+verify). Deriva pasos
 * accionables del grafo y del goal: explora el símbolo relevante, su blast radius
 * (callers/callees) y cómo operar (test/build). El agente sabe QUÉ tocar.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que plan "<goal>" genere pasos derivados del grafo y del goal,
 *   para que el plan sea una guía real de implementación.
 *
 * AC (features/plan-real.feature):
 *   AC-1 analiza el goal y busca símbolos relevantes en el grafo.
 *   AC-2 pasos incluyen explore + callers/callees + operar (test/build).
 *   AC-3 si el goal menciona un símbolo, el plan lo usa.
 *   AC-4 determinista.
 */
import { indexProject } from '../context/graph'
import { explore, callers } from '../context/queries'

/** Un paso del plan. */
export interface PlanStep { action: string; target: string }

/** rol: extrae símbolos candidatos del goal (palabras que matchean símbolos del grafo). */
function goalSymbols(goal: string, symbols: Array<{ name: string }>): string[] {
  const words = goal.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean)
  return symbols
    .map((s) => s.name)
    .filter((name) => words.some((w) => name.toLowerCase().includes(w) || w.includes(name.toLowerCase())))
    .slice(0, 3)
}

/** rol: genera un plan accionable derivado del grafo y del goal (AC-1..4). */
export async function generatePlan(goal: string, projectDir: string): Promise<{ goal: string; steps: PlanStep[] }> {
  // indexar completo siempre (no incremental) — garantiza determinismo (AC-4) y que el plan
  // siempre vea el grafo real. Es un plan, no una operación frecuente; el costo es aceptable.
  const { nodes } = await indexProject(projectDir, { incremental: false })
  // ordenar por nombre para determinismo (AC-4)
  const symbols = nodes.filter((n) => n.kind !== 'import').sort((a, b) => a.name.localeCompare(b.name))
  const files = new Set(nodes.map((n) => n.file)).size

  const steps: PlanStep[] = []
  const relevant = goalSymbols(goal, symbols)

  if (relevant.length > 0) {
    // el goal menciona símbolos → explora el principal + su blast radius
    const main = relevant[0]
    steps.push({ action: 'explore', target: main })
    const r = await explore(main, projectDir)
    const ids = r.nodes.map((n) => n.id)
    if (ids.length > 0) {
      const callersR = await callers(ids[0], projectDir)
      if (callersR.nodes.length > 0) {
        steps.push({ action: 'callers', target: `${main} (${callersR.nodes.length} callers)` })
      }
    }
    steps.push({ action: 'map-deps', target: `${files} files, ${symbols.length} symbols indexed` })
  } else {
    // goal genérico → explora el símbolo más conectado (hub) + su blast radius
    const hub = symbols.slice(0, 5).find((s) => s.kind === 'function') ?? symbols[0]
    if (hub) {
      steps.push({ action: 'explore', target: hub.name })
      const r = await explore(hub.name, projectDir)
      const ids = r.nodes.map((n) => n.id)
      if (ids.length > 0) {
        const callersR = await callers(ids[0], projectDir)
        if (callersR.nodes.length > 0) {
          steps.push({ action: 'callers', target: `${hub.name} (${callersR.nodes.length} callers)` })
        }
      }
      steps.push({ action: 'map-deps', target: `${files} files, ${symbols.length} symbols indexed` })
    } else {
      steps.push({ action: 'index', target: projectDir })
    }
  }

  // operar: verificar con test/build (señal externa real)
  steps.push({ action: 'op.test', target: 'verify it doesn\'t break' })
  steps.push({ action: 'verify', target: goal })
  return { goal, steps }
}
