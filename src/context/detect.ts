/**
 * rol: Detección determinista del stack de un proyecto leyendo manifestos reales (AC-4 stack del dashboard).
 * Consume StackInfo de src/context/types.ts (ANCLA — NO modificar).
 *
 * Spec:
 *   Como desarrollador/creador con cualquier proyecto,
 *   quiero que netrunner detecte lenguaje/framework/packageManager leyendo
 *   los manifestos reales del proyecto de forma determinista,
 *   para que el dashboard (AC-4) muestre el stack correcto sin preguntar.
 *
 * AC:
 *   - AC-D1: package.json + lockfile distingue pnpm/npm/yarn/bun.
 *   - AC-D2: framework por deps (astro/react/next/vite), default node.
 *   - AC-D3: lockfile npm/yarn/bun/bun.lockb.
 *   - AC-D4: pyproject.toml (pip/poetry/uv) o requirements.txt (pip) → python.
 *   - AC-D5: Cargo.toml → rust/cargo; go.mod → go/go.
 *   - AC-D6: sin manifiesto → 'unknown' + manifestPath ''.
 *   - AC-D7: manifiesto ilegible/inválido → tratado como ausente (nunca lanza).
 *
 * Gherkin:
 *   GIVEN un proyecto con package.json y pnpm-lock.yaml
 *   WHEN detectStack(projectDir)
 *   THEN packageManager pnpm y manifestPath 'package.json'.
 *   GIVEN un proyecto sin ningún manifiesto
 *   WHEN detectStack(projectDir)
 *   THEN language/framework/packageManager 'unknown' y manifestPath ''.
 */
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { StackInfo } from './types'

const UNKNOWN: StackInfo = { language: 'unknown', framework: 'unknown', packageManager: 'unknown', manifestPath: '' }

/** rol: lee el contenido de un archivo o undefined si no existe / no es legible (AC-D7, nunca lanza). */
async function readOptional(projectDir: string, relativePath: string): Promise<string | undefined> {
  try {
    return await readFile(join(projectDir, relativePath), 'utf8')
  } catch {
    return undefined
  }
}

/** rol: devuelve el manifiesto presente con mayor prioridad (orden determinista por idioma). */
async function findManifest(projectDir: string): Promise<{ path: string; text: string } | undefined> {
  const candidates = ['package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod']
  for (const relativePath of candidates) {
    const text = await readOptional(projectDir, relativePath)
    if (text !== undefined) return { path: relativePath, text }
  }
  return undefined
}

/** rol: framework del proyecto por deps de package.json (AC-D2); default node. */
function frameworkFromPackage(pkg: Record<string, unknown>): string {
  const deps: Record<string, unknown> = {
    ...(pkg.dependencies as Record<string, unknown> | undefined),
    ...(pkg.devDependencies as Record<string, unknown> | undefined),
  }
  const known = ['astro', 'react', 'next', 'vite']
  const framework = known.find((name) => name in deps)
  return framework ?? 'node'
}

/** rol: detecta el stack TS/JS desde package.json + lockfiles (AC-D1/D2/D3). */
async function detectPackageStack(projectDir: string, packagePath: string): Promise<StackInfo> {
  const raw = await readOptional(projectDir, packagePath)
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(raw ?? '{}') as Record<string, unknown>
  } catch {
    // AC-D7: manifiesto inválido se trata como ausente (nunca lanza)
    return UNKNOWN
  }
  const lockfiles = ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock', 'package-lock.json']
  let packageManager = 'npm'
  for (const lockfile of lockfiles) {
    if ((await readOptional(projectDir, lockfile)) !== undefined) {
      packageManager = basename(lockfile).startsWith('pnpm') ? 'pnpm' : basename(lockfile).startsWith('yarn') ? 'yarn' : basename(lockfile).startsWith('bun') ? 'bun' : 'npm'
      break
    }
  }
  return { language: 'typescript', framework: frameworkFromPackage(pkg), packageManager, manifestPath: packagePath }
}

/** rol: detecta el stack Python desde pyproject.toml o requirements.txt (AC-D4). */
async function detectPythonStack(projectDir: string, pyprojectPath: string): Promise<StackInfo> {
  const text = await readOptional(projectDir, pyprojectPath)
  if (text === undefined) {
    return { language: 'python', framework: 'python', packageManager: 'pip', manifestPath: 'requirements.txt' }
  }
  const packageManager = text.includes('[tool.poetry') ? 'poetry' : text.includes('[dependency-groups]') ? 'uv' : 'pip'
  return { language: 'python', framework: 'python', packageManager, manifestPath: pyprojectPath }
}

/** rol: detección de stack por manifestos (AC-D1..D7). */
export async function detectStack(projectDir: string): Promise<StackInfo> {
  const manifest = await findManifest(projectDir)
  if (manifest === undefined) return UNKNOWN
  if (manifest.path === 'package.json') return detectPackageStack(projectDir, manifest.path)
  if (manifest.path === 'pyproject.toml') return detectPythonStack(projectDir, manifest.path)
  if (manifest.path === 'requirements.txt') return { language: 'python', framework: 'python', packageManager: 'pip', manifestPath: 'requirements.txt' }
  if (manifest.path === 'Cargo.toml') return { language: 'rust', framework: 'rust', packageManager: 'cargo', manifestPath: 'Cargo.toml' }
  return { language: 'go', framework: 'go', packageManager: 'go', manifestPath: 'go.mod' }
}
