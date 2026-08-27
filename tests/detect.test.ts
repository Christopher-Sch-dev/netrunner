/**
 * rol: Test de detección de stack por manifestos (T1.3 — AC-4 stack del dashboard).
 *
 * Spec:
 *   Como desarrollador/creador con cualquier proyecto,
 *   quiero que netrunner detecte lenguaje/framework/packageManager leyendo
 *   los manifestos reales del proyecto de forma determinista,
 *   para que el dashboard (AC-4) muestre el stack correcto sin preguntar.
 *
 * AC detect:
 *   - AC-D1: project con package.json + pnpm-lock.yaml → typescript|javascript, pnpm.
 *   - AC-D2: framework por deps de package.json (astro/react/next/vite) → framework.
 *   - AC-D3: package.json + npm/yarn/bun lockfile → npm/yarn/bun.
 *   - AC-D4: pyproject.toml o requirements.txt → python, pip/poetry/uv.
 *   - AC-D5: Cargo.toml → rust, cargo. go.mod → go, go mod.
 *   - AC-D6: sin manifiesto → language/framework/packageManager/unknown + manifestPath ''.
 *   - AC-D7: manifiesto ilegible/no parseable → tratado como ausente (no lanza).
 *
 * Gherkin:
 *   GIVEN un directorio con package.json y pnpm-lock.yaml
 *   WHEN llamo a detectStack(dir)
 *   THEN language es typescript/javascript y packageManager pnpm.
 *   GIVEN un directorio sin ningún manifiesto
 *   WHEN llamo a detectStack(dir)
 *   THEN devuelve language/framework/packageManager 'unknown' y manifestPath ''.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectStack } from '../src/context/detect'

const dirs: string[] = []

async function makeDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'netrunner-detect-'))
  for (const [relativePath, content] of Object.entries(files)) {
    await writeFile(join(dir, relativePath), content)
  }
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const ASTRO_PACKAGE = JSON.stringify({ dependencies: { astro: '^5.0.0' } })
const NEXT_PACKAGE = JSON.stringify({ dependencies: { next: '^15.0.0' } })
const REACT_PACKAGE = JSON.stringify({ dependencies: { react: '^18.0.0' } })
const VITE_PACKAGE = JSON.stringify({ dependencies: { vite: '^6.0.0' } })
const PLAIN_TS = JSON.stringify({ devDependencies: { typescript: '^5.0.0' } })

describe('detectStack — detección por manifestos', () => {
  it('detecta pnpm por pnpm-lock.yaml (AC-D1)', async () => {
    const dir = await makeDir({ 'package.json': PLAIN_TS, 'pnpm-lock.yaml': '' })
    const info = await detectStack(dir)
    expect(info.packageManager).toBe('pnpm')
    expect(info.manifestPath).toBe('package.json')
    expect(['typescript', 'javascript']).toContain(info.language)
  })

  it('detecta framework astro por dep (AC-D2)', async () => {
    const dir = await makeDir({ 'package.json': ASTRO_PACKAGE, 'pnpm-lock.yaml': '' })
    expect((await detectStack(dir)).framework).toBe('astro')
  })

  it('detecta next por dep (AC-D2)', async () => {
    const dir = await makeDir({ 'package.json': NEXT_PACKAGE, 'pnpm-lock.yaml': '' })
    expect((await detectStack(dir)).framework).toBe('next')
  })

  it('detecta react por dep (AC-D2)', async () => {
    const dir = await makeDir({ 'package.json': REACT_PACKAGE, 'pnpm-lock.yaml': '' })
    expect((await detectStack(dir)).framework).toBe('react')
  })

  it('detecta vite por dep (AC-D2)', async () => {
    const dir = await makeDir({ 'package.json': VITE_PACKAGE, 'pnpm-lock.yaml': '' })
    expect((await detectStack(dir)).framework).toBe('vite')
  })

  it('sin framework conocido → node (AC-D2 default)', async () => {
    const dir = await makeDir({ 'package.json': PLAIN_TS, 'pnpm-lock.yaml': '' })
    expect((await detectStack(dir)).framework).toBe('node')
  })

  it('package.json sin lockfile → npm (AC-D3)', async () => {
    const dir = await makeDir({ 'package.json': PLAIN_TS })
    expect((await detectStack(dir)).packageManager).toBe('npm')
  })

  it('yarn.lock → yarn (AC-D3)', async () => {
    const dir = await makeDir({ 'package.json': PLAIN_TS, 'yarn.lock': '' })
    expect((await detectStack(dir)).packageManager).toBe('yarn')
  })

  it('bun.lockb → bun (AC-D3)', async () => {
    const dir = await makeDir({ 'package.json': PLAIN_TS, 'bun.lockb': '' })
    expect((await detectStack(dir)).packageManager).toBe('bun')
  })

  it('detecta python por requirements.txt → pip (AC-D4)', async () => {
    const dir = await makeDir({ 'requirements.txt': 'fastapi\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('python')
    expect(info.packageManager).toBe('pip')
    expect(info.manifestPath).toBe('requirements.txt')
  })

  it('detecta python + poetry por pyproject.toml (AC-D4)', async () => {
    const dir = await makeDir({ 'pyproject.toml': '[tool.poetry]\nname="x"\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('python')
    expect(info.packageManager).toBe('poetry')
    expect(info.manifestPath).toBe('pyproject.toml')
  })

  it('detecta python + uv por pyproject.toml (AC-D4)', async () => {
    const dir = await makeDir({ 'pyproject.toml': '[dependency-groups]\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('python')
    expect(info.packageManager).toBe('uv')
  })

  it('detecta rust por Cargo.toml → cargo (AC-D5)', async () => {
    const dir = await makeDir({ 'Cargo.toml': '[package]\nname="x"\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('rust')
    expect(info.packageManager).toBe('cargo')
    expect(info.manifestPath).toBe('Cargo.toml')
  })

  it('detecta go por go.mod → go (AC-D5)', async () => {
    const dir = await makeDir({ 'go.mod': 'module example.com/x\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('go')
    expect(info.packageManager).toBe('go')
    expect(info.manifestPath).toBe('go.mod')
  })

  it('sin manifiesto → unknown + manifestPath vacío (AC-D6)', async () => {
    const dir = await makeDir({ 'README.md': 'hi\n' })
    const info = await detectStack(dir)
    expect(info.language).toBe('unknown')
    expect(info.framework).toBe('unknown')
    expect(info.packageManager).toBe('unknown')
    expect(info.manifestPath).toBe('')
  })

  it('package.json inválido → tratado como ausente (AC-D7)', async () => {
    const dir = await makeDir({ 'package.json': '{not valid json', 'pnpm-lock.yaml': '' })
    const info = await detectStack(dir)
    expect(info.language).toBe('unknown')
    expect(info.manifestPath).toBe('')
  })
})
