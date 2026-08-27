/**
 * rol: resume — el recuerdo que se re-adhiere al reconectar (features/resume.feature).
 * LA VISION (mina cyberpunk #7): el "virus persiste tras Jack-Out; la próxima sesión
 * la retoma". Al reconectar (jack-in), el agente carga TODO el estado del deck:
 * snapshot + decisiones open + history reciente + canonStale (señal de canon pendiente).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que al reconectar se cargue todo el estado del deck,
 *   para retomar donde quedó sin re-explorar desde cero.
 *
 * AC (features/resume.feature):
 *   AC-1 resume(dir) → { snapshot, decisions, history, canonStale }.
 *   AC-2 decisiones open se cargan desde .netrunner/decisions/.
 *   AC-3 history reciente (últimas 20).
 *   AC-4 canonStale indica si el canon requiere actualización (señal, no reescritura).
 *   AC-5 sin estado → vacíos (no falla).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadSnapshot } from '../context/snapshot'
import { history } from '../history/index'
import { canonStale } from '../canon/stale'

/** Una decisión cargada del deck. */
export interface ResumeDecision { slug: string; status: string; content: string }

/** rol: carga las decisiones open de .netrunner/decisions/ (AC-2). */
function loadOpenDecisions(projectDir: string): ResumeDecision[] {
  const dir = join(projectDir, '.netrunner', 'decisions')
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const content = readFileSync(join(dir, f), 'utf8')
        const status = /estado:\s*(\w+)/i.exec(content)?.[1] ?? 'open'
        return { slug: f.replace(/\.md$/, ''), status, content }
      })
      .filter((d) => d.status === 'open')
  } catch {
    return []
  }
}

/** rol: resume — carga el estado completo del deck al reconectar (AC-1..5). */
export async function resume(projectDir: string): Promise<{
  snapshot: ReturnType<typeof loadSnapshot>
  decisions: ResumeDecision[]
  history: ReturnType<typeof history>
  canonStale: boolean
}> {
  return {
    snapshot: loadSnapshot(projectDir),
    decisions: loadOpenDecisions(projectDir),
    history: history(projectDir),
    canonStale: canonStale(projectDir),
  }
}
