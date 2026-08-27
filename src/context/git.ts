/**
 * rol: Detector git de Netrunner (Wave 6 — skill auto-generante).
 * Lee el estado git del proyecto DIRECTAMENTE de `.git/` (HEAD, config, logs)
 * sin ejecutar el binario git — determinista, PURE, sin I/O pesada. Es la base
 * de la feature de documentación que Cris quiere: en qué rama está, si está
 * conectado a GitHub, y los últimos commits.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer el estado git (rama, remoto, commits),
 *   para que la skill auto-generante documente el proyecto.
 *
 * AC (features/git.feature):
 *   AC-1 gitInfo(dir) → { branch, remote, remoteUrl, lastCommits }.
 *   AC-2 PURE: lee .git/HEAD y .git/config (sin binario git).
 *   AC-3 no es repo → { branch: null, remote: null } (no falla).
 *   AC-4 lastCommits hasta 5 (hash corto + mensaje).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Estado git del proyecto. */
export interface GitInfo {
  branch: string | null
  remote: string | null
  remoteUrl: string | null
  lastCommits: Array<{ hash: string; message: string }>
}

/** rol: lee la rama actual desde .git/HEAD (ref: refs/heads/<branch>). */
function readBranch(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim()
    const m = head.match(/^ref: refs\/heads\/(.+)$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/** rol: lee el remoto desde .git/config ([remote "origin"] url = ...). */
function readRemote(gitDir: string): { remote: string | null; remoteUrl: string | null } {
  try {
    const config = readFileSync(join(gitDir, 'config'), 'utf8')
    const m = config.match(/\[remote "([^"]+)"\]\s*url\s*=\s*([^\s]+)/)
    return m ? { remote: m[1], remoteUrl: m[2] } : { remote: null, remoteUrl: null }
  } catch {
    return { remote: null, remoteUrl: null }
  }
}

/** rol: lee hasta 5 commits recientes desde .git/logs/HEAD (hash + mensaje). */
function readLastCommits(gitDir: string): Array<{ hash: string; message: string }> {
  try {
    const log = readFileSync(join(gitDir, 'logs', 'HEAD'), 'utf8')
    const lines = log.trim().split('\n').filter(Boolean)
    return lines.slice(-5).map((line) => {
      const parts = line.split('\t')
      const hash = parts[0]?.slice(0, 7) ?? ''
      const message = parts[1] ?? ''
      return { hash, message }
    })
  } catch {
    return []
  }
}

/** rol: devuelve el estado git del proyecto (determinista, no falla si no es repo). */
export function gitInfo(projectDir: string): GitInfo {
  const gitDir = join(projectDir, '.git')
  if (!existsSync(gitDir)) {
    return { branch: null, remote: null, remoteUrl: null, lastCommits: [] }
  }
  const branch = readBranch(gitDir)
  const { remote, remoteUrl } = readRemote(gitDir)
  const lastCommits = readLastCommits(gitDir)
  return { branch, remote, remoteUrl, lastCommits }
}
