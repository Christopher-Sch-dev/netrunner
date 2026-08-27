/**
 * rol: persist — decisiones durables de Netrunner (mina cyberpunk feature #7).
 * Deja una DECISIÓN con provenance (quién/qué/cuándo) que sobrevive a la sesión,
 * como el "virus que persiste tras Jack-Out" en la NET Architecture. La próxima
 * sesión la retoma.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero dejar una decisión durable con provenance,
 *   para que la próxima sesión la retome.
 *
 * AC (features/persist.feature):
 *   AC-1 persistDecision(dir, decision, autor) → escribe .netrunner/decisions/<slug>.md.
 *   AC-2 incluye fecha, autor, decisión, contexto, estado (open/done).
 *   AC-3 slug derivado del texto (no colisiona).
 *   AC-4 idempotente (mismo slug → sobreescribe).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** rol: deriva un slug seguro del texto de la decisión (AC-3, fix juez: no truncar a 8 chars). */
function slugify(text: string): string {
  // normaliza unicode (ñ→n, á→a) antes de limpiar — fix: 'decisión' no debe quedar 'decisi-n'
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'decision'
}

/** rol: persiste una decisión durable con provenance (AC-1/2/4). */
export function persistDecision(projectDir: string, decision: string, author: string): { slug: string; path: string } {
  const slug = slugify(decision)
  const path = join(projectDir, '.netrunner', 'decisions', `${slug}.md`)
  mkdirSync(dirname(path), { recursive: true })
  const content = [
    `# Decisión: ${decision}`,
    '',
    `- **Fecha**: ${new Date().toISOString()}`,
    `- **Autor**: ${author}`,
    `- **Estado**: open`,
    '',
    `## Decisión`,
    decision,
    '',
  ].join('\n')
  writeFileSync(path, content)
  return { slug, path }
}
