/**
 * rol: Netrunner git detector (Wave 6 — self-generating skill).
 * Reads the project git state DIRECTLY from `.git/` (HEAD, config, logs)
 * without running the git binary — deterministic, PURE, no heavy I/O. It is the basis
 * of the documentation feature: which branch it is on, whether it is
 * connected to GitHub, and the latest commits.
 *
 * SPEC (Mandamiento 0):
 *   As an agent operating a Netrunner project,
 *   I want to know the git state (branch, remote, commits),
 *   so that the self-generating skill documents the project.
 *
 * AC (features/git.feature):
 *   AC-1 gitInfo(dir) → { branch, remote, remoteUrl, lastCommits }.
 *   AC-2 PURE: reads .git/HEAD and .git/config (no git binary).
 *   AC-3 not a repo → { branch: null, remote: null } (does not fail).
 *   AC-4 lastCommits up to 5 (short hash + message).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Project git state. */
export interface GitInfo {
  branch: string | null
  remote: string | null
  remoteUrl: string | null
  lastCommits: Array<{ hash: string; message: string }>
}

/** rol: reads the current branch from .git/HEAD (ref: refs/heads/<branch>). */
function readBranch(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim()
    const m = head.match(/^ref: refs\/heads\/(.+)$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/** rol: reads the remote from .git/config ([remote "origin"] url = ...). */
function readRemote(gitDir: string): { remote: string | null; remoteUrl: string | null } {
  try {
    const config = readFileSync(join(gitDir, 'config'), 'utf8')
    const m = config.match(/\[remote "([^"]+)"\]\s*url\s*=\s*([^\s]+)/)
    return m ? { remote: m[1], remoteUrl: m[2] } : { remote: null, remoteUrl: null }
  } catch {
    return { remote: null, remoteUrl: null }
  }
}

/** rol: reads up to 5 recent commits from .git/logs/HEAD (hash + message). */
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

/** rol: returns the project git state (deterministic, does not fail if not a repo). */
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
