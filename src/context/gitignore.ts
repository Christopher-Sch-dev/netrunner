/**
 * rol: gitignore — respetar el .gitignore del proyecto (features/gitignore.feature).
 * LA VISION (gap señalado por Cris + comparación con Graphify): el grafo NO debe
 * abstraer lo que el proyecto ignora (node_modules, vendor/, generated/). Carga
 * los patrones del .gitignore y verifica si un path está ignorado.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el grafo respete el .gitignore del proyecto,
 *   para no abstraer lo que el proyecto ignora.
 *
 * AC (features/gitignore.feature):
 *   AC-1 loadGitignore(dir) → patrones del .gitignore.
 *   AC-2 isIgnored(path, patterns) → true si matchea.
 *   AC-4 sin .gitignore → lista vacía.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** rol: carga los patrones del .gitignore (AC-1/4). */
export function loadGitignore(projectDir: string): string[] {
  const path = join(projectDir, '.gitignore')
  if (!existsSync(path)) return []
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

/** rol: true si el path matchea un patrón del .gitignore (AC-2). */
export function isIgnored(path: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    const clean = p.replace(/^\/+|\/+$/g, '')
    if (!clean) return false
    // patrón de directorio (termina en /) → matchea si el path empieza con el dir
    if (p.endsWith('/')) return path.startsWith(clean + '/') || path === clean
    // patrón de archivo → matchea si el path contiene el patrón
    return path.includes(clean)
  })
}
