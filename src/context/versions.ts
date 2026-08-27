/**
 * rol: Detector de versiones de Netrunner (Wave 6 — skill auto-generante).
 * Lee las versiones de las dependencias del proyecto desde package.json,
 * separadas en prod (dependencies) y dev (devDependencies), ordenadas
 * alfabéticamente. Es la base de la feature de documentación que Cris quiere:
 * "las versiones de lo que tenemos instalado separado y ordenado".
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer las versiones de las dependencias (prod vs dev),
 *   para que la skill auto-generante documente qué versiones se usan.
 *
 * AC (features/versions.feature):
 *   AC-1 versionsInfo(dir) → { prod, dev }.
 *   AC-2 lee package.json (dependencies → prod, devDependencies → dev).
 *   AC-3 sin package.json → { prod: {}, dev: {} } (no falla).
 *   AC-4 ordenado alfabéticamente.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Versiones separadas por categoría (prod vs dev). */
export interface VersionsInfo {
  prod: Record<string, string>
  dev: Record<string, string>
}

/** rol: devuelve las versiones del proyecto (determinista, no falla sin package.json). */
export function versionsInfo(projectDir: string): VersionsInfo {
  const path = join(projectDir, 'package.json')
  if (!existsSync(path)) return { prod: {}, dev: {} }
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const sort = (o: Record<string, string>): Record<string, string> =>
      Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))
    return {
      prod: sort(pkg.dependencies ?? {}),
      dev: sort(pkg.devDependencies ?? {}),
    }
  } catch {
    return { prod: {}, dev: {} } // package.json inválido → no falla
  }
}
