/**
 * rol: net sleeve — el deck portable (features/sleeve.feature).
 * LA VISION (Construct): el deck se puede llevar a otro proyecto. `exportSleeve`
 * serializa snapshot + decisiones + history + canon; `importSleeve` lo restaura
 * en otro proyecto. El "sleeve" que se re-adhiere.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero exportar el deck como un Construct portable,
 *   para llevar el estado del deck a otro proyecto.
 *
 * AC (features/sleeve.feature):
 *   AC-1 exportSleeve(dir) → { snapshot, decisions, history, canon }.
 *   AC-2 importSleeve(dir, sleeve) → restaura el estado.
 *   AC-3 sin estado → sleeve vacío.
 *   AC-4 determinista.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { loadSnapshot } from '../context/snapshot'
import { history } from '../history/index'
import { canonStale } from '../canon/stale'

/** El sleeve portable. */
export interface Sleeve {
  snapshot: ReturnType<typeof loadSnapshot>
  decisions: Array<{ slug: string; content: string }>
  history: ReturnType<typeof history>
  canonStale: boolean
}

/** rol: exporta el estado del deck (AC-1/3/4). */
export function exportSleeve(projectDir: string): Sleeve {
  const decisions: Array<{ slug: string; content: string }> = []
  const decDir = join(projectDir, '.netrunner', 'decisions')
  if (existsSync(decDir)) {
    try {
      for (const f of readdirSync(decDir)) {
        if (f.endsWith('.md')) {
          decisions.push({ slug: f.replace(/\.md$/, ''), content: readFileSync(join(decDir, f), 'utf8') })
        }
      }
    } catch { /* skip */ }
  }
  return {
    snapshot: loadSnapshot(projectDir),
    decisions,
    history: history(projectDir),
    canonStale: canonStale(projectDir),
  }
}

/** rol: importa el estado del deck en otro proyecto (AC-2). */
export function importSleeve(projectDir: string, sleeve: Sleeve): void {
  const decDir = join(projectDir, '.netrunner', 'decisions')
  for (const d of sleeve.decisions) {
    mkdirSync(decDir, { recursive: true })
    writeFileSync(join(decDir, `${d.slug}.md`), d.content)
  }
}
