/**
 * rol: jack-remote — conectar a un repo GitHub remoto (features/jack-remote.feature).
 * LA VISION: NetRunner conecta a CUALQUIER proyecto, no solo directorios locales.
 * `jack <owner/repo>` valida que el repo exista (supply-chain guard), lo clona y
 * corre initProject (conectable layer + canon).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que jack <owner/repo> clone un repo GitHub remoto y lo conecte,
 *   para que NetRunner conecte a cualquier proyecto (universalidad total).
 *
 * AC (features/jack-remote.feature):
 *   AC-1 jackRemote(owner, repo, destDir) clona + initProject.
 *   AC-2 devuelve { cloned, dir, counts }.
 *   AC-3 sin auth git → HTTPS público.
 *   AC-4 supply-chain guard: verifica que el repo existe antes de clonar.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { initProject } from '../init'

const execFileAsync = promisify(execFile)

/** rol: valida el formato owner/repo (AC-4). */
function parseOwnerRepo(spec: string): { owner: string; repo: string } {
  const m = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(spec)
  if (!m) throw new Error(`formato inválido: '${spec}' — usa owner/repo`)
  return { owner: m[1], repo: m[2] }
}

/** rol: verifica que el repo exista en GitHub (supply-chain guard, AC-4). */
async function repoExists(owner: string, repo: string): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { 'User-Agent': 'netrunner' } })
    if (!res.ok) throw new Error(`repo no existe o no accesible: ${owner}/${repo} (HTTP ${res.status})`)
  } catch (e) {
    if (e instanceof Error && e.message.includes('HTTP')) throw e
    // sin red → no bloquear el clon (git lo intentará)
  }
}

/** rol: jack a un repo GitHub remoto (AC-1..4). */
export async function jackRemote(spec: string, destDir: string): Promise<{ cloned: boolean; dir: string; counts: { nodes: number; edges: number } }> {
  const { owner, repo } = parseOwnerRepo(spec)
  await repoExists(owner, repo)
  const dir = join(destDir, repo)
  // clonar HTTPS público (AC-3)
  await execFileAsync('git', ['clone', '--depth', '1', `https://github.com/${owner}/${repo}.git`, dir])
  // conectar el deck (initProject: grafo + conectable layer + canon)
  const result = await initProject(dir)
  return { cloned: true, dir, counts: result.counts }
}
