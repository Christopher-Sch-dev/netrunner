import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gitInfo } from '../src/context/git'

// role: tests for the git detector (AC-1..4 of features/git.feature).
// Reads .git/HEAD and .git/config directly (deterministic, no git binary).

describe('detector git', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-git-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('repo git con remoto: devuelve branch, remote y remoteUrl (AC-1/2)', () => {
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
    writeFileSync(
      join(dir, '.git', 'config'),
      '[remote "origin"]\n\turl = https://github.com/Christopher-Sch-dev/netrunner.git\n',
    )

    const info = gitInfo(dir)

    expect(info.branch).toBe('develop')
    expect(info.remote).toBe('origin')
    expect(info.remoteUrl).toContain('github.com')
  })

  it('no es repo git → branch null, remote null (AC-3, no falla)', () => {
    const info = gitInfo(dir)
    expect(info.branch).toBeNull()
    expect(info.remote).toBeNull()
  })

  it('lastCommits lista hasta 5 commits recientes (AC-4)', () => {
    mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true })
    mkdirSync(join(dir, '.git', 'logs'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    // simulates 3 commits in the log
    writeFileSync(join(dir, '.git', 'logs', 'HEAD'), [
      'abc1234 commit 1',
      'def5678 commit 2',
      'ghi9012 commit 3',
    ].join('\n') + '\n')

    const info = gitInfo(dir)
    expect(info.lastCommits.length).toBeLessThanOrEqual(5)
    expect(info.lastCommits.length).toBeGreaterThan(0)
  })
})
