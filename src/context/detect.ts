/**
 * rol: Deterministic detection of a project's stack by reading real manifests (AC-4 dashboard stack).
 * Consumes StackInfo from src/context/types.ts (ANCHOR — DO NOT modify).
 *
 * Spec:
 *   As a developer/creator with any project,
 *   I want netrunner to detect language/framework/packageManager by reading
 *   the project's real manifests deterministically,
 *   so that the dashboard (AC-4) shows the correct stack without asking.
 *
 * AC:
 *   - AC-D1: package.json + lockfile distinguishes pnpm/npm/yarn/bun.
 *   - AC-D2: framework by deps (astro/react/next/vite), default node.
 *   - AC-D3: lockfile npm/yarn/bun/bun.lockb.
 *   - AC-D4: pyproject.toml (pip/poetry/uv) or requirements.txt (pip) → python.
 *   - AC-D5: Cargo.toml → rust/cargo; go.mod → go/go.
 *   - AC-D6: no manifest → 'unknown' + manifestPath ''.
 *   - AC-D7: unreadable/invalid manifest → treated as absent (never throws).
 *
 * Gherkin:
 *   GIVEN a project with package.json and pnpm-lock.yaml
 *   WHEN detectStack(projectDir)
 *   THEN packageManager pnpm and manifestPath 'package.json'.
 *   GIVEN a project with no manifest at all
 *   WHEN detectStack(projectDir)
 *   THEN language/framework/packageManager 'unknown' and manifestPath ''.
 */
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { StackInfo } from './types'

const UNKNOWN: StackInfo = { language: 'unknown', framework: 'unknown', packageManager: 'unknown', manifestPath: '' }

/** rol: reads a file's content or undefined if it does not exist / is not readable (AC-D7, never throws). */
async function readOptional(projectDir: string, relativePath: string): Promise<string | undefined> {
  try {
    return await readFile(join(projectDir, relativePath), 'utf8')
  } catch {
    return undefined
  }
}

/** rol: returns the manifest present with the highest priority (deterministic order by language). */
async function findManifest(projectDir: string): Promise<{ path: string; text: string } | undefined> {
  const candidates = ['package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod']
  for (const relativePath of candidates) {
    const text = await readOptional(projectDir, relativePath)
    if (text !== undefined) return { path: relativePath, text }
  }
  return undefined
}

/** rol: project framework by package.json deps (AC-D2); default node. */
function frameworkFromPackage(pkg: Record<string, unknown>): string {
  const deps: Record<string, unknown> = {
    ...(pkg.dependencies as Record<string, unknown> | undefined),
    ...(pkg.devDependencies as Record<string, unknown> | undefined),
  }
  const known = ['astro', 'react', 'next', 'vite']
  const framework = known.find((name) => name in deps)
  return framework ?? 'node'
}

/** rol: detects the TS/JS stack from package.json + lockfiles (AC-D1/D2/D3). */
async function detectPackageStack(projectDir: string, packagePath: string): Promise<StackInfo> {
  const raw = await readOptional(projectDir, packagePath)
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(raw ?? '{}') as Record<string, unknown>
  } catch {
    // AC-D7: invalid manifest is treated as absent (never throws)
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

/** rol: detects the Python stack from pyproject.toml or requirements.txt (AC-D4). */
async function detectPythonStack(projectDir: string, pyprojectPath: string): Promise<StackInfo> {
  const text = await readOptional(projectDir, pyprojectPath)
  if (text === undefined) {
    return { language: 'python', framework: 'python', packageManager: 'pip', manifestPath: 'requirements.txt' }
  }
  const packageManager = text.includes('[tool.poetry') ? 'poetry' : text.includes('[dependency-groups]') ? 'uv' : 'pip'
  return { language: 'python', framework: 'python', packageManager, manifestPath: pyprojectPath }
}

/** rol: stack detection by manifests (AC-D1..D7). */
export async function detectStack(projectDir: string): Promise<StackInfo> {
  const manifest = await findManifest(projectDir)
  if (manifest === undefined) return UNKNOWN
  if (manifest.path === 'package.json') return detectPackageStack(projectDir, manifest.path)
  if (manifest.path === 'pyproject.toml') return detectPythonStack(projectDir, manifest.path)
  if (manifest.path === 'requirements.txt') return { language: 'python', framework: 'python', packageManager: 'pip', manifestPath: 'requirements.txt' }
  if (manifest.path === 'Cargo.toml') return { language: 'rust', framework: 'rust', packageManager: 'cargo', manifestPath: 'Cargo.toml' }
  return { language: 'go', framework: 'go', packageManager: 'go', manifestPath: 'go.mod' }
}
