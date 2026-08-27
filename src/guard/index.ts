/**
 * rol: guard — Black ICE de Netrunner (mina cyberpunk feature #3).
 * Verifica protecciones del repo: detecta secrets (ghp_/sk-/token=) y archivos
 * protegidos (.env/.pem/.key) que no deberían commitearse. Protege el proyecto
 * del agente (Mandamiento 7).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el motor verifique protecciones del repo,
 *   para que el proyecto esté protegido (Black ICE).
 *
 * AC (features/guard.feature):
 *   AC-1 guardCheck(dir) → { ok, issues: [{ file, reason }] }.
 *   AC-2 detecta secrets (ghp_/sk-/token=).
 *   AC-3 detecta archivos protegidos (.env/.pem/.key).
 *   AC-4 sin issues → { ok: true, issues: [] }.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])
const PROTECTED_FILES = new Set(['.env', '.env.local', '.pem', '.key', '.p12'])
const SECRET_PATTERNS = [/ghp_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /token\s*=\s*['"][^'"]{16,}['"]/i]

/** Un issue de protección. */
export interface GuardIssue { file: string; reason: string }

/** Resultado del guard. */
export interface GuardResult { ok: boolean; issues: GuardIssue[] }

/** rol: verifica protecciones del repo (determinista, AC-1..4). */
export function guardCheck(projectDir: string): GuardResult {
  const issues: GuardIssue[] = []
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile()) {
        const rel = relative(projectDir, join(dir, e.name))
        // archivos protegidos (AC-3)
        if (PROTECTED_FILES.has(e.name)) {
          issues.push({ file: rel, reason: 'archivo protegido (no commitear)' })
          continue
        }
        // secrets en contenido (AC-2)
        try {
          const content = readFileSync(join(dir, e.name), 'utf8')
          if (SECRET_PATTERNS.some((re) => re.test(content))) {
            issues.push({ file: rel, reason: 'posible secret detectado' })
          }
        } catch { /* binario/ilegible → skip */ }
      }
    }
  }
  walk(projectDir)
  return { ok: issues.length === 0, issues }
}
