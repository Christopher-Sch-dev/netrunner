import { describe, it, expect, vi } from 'vitest'
import { jackRemote } from '../src/jack-remote/index'

// mock bun:sqlite → node:sqlite (para que initProject → graph resuelva)
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...args: unknown[]) => (db.prepare(sql) as { get: (...a: unknown[]) => unknown }).get(...args),
          all: (...args: unknown[]) => (db.prepare(sql) as { all: (...a: unknown[]) => unknown }).all(...args),
          run: (...args: unknown[]) => (db.prepare(sql) as { run: (...a: unknown[]) => unknown }).run(...args),
        }
      }
    },
  }
})

// role: tests for jack-remote (AC-1..4 of features/jack-remote.feature).
// Conectar a un repo GitHub remoto (universalidad total).

describe('jack-remote (conectar repo GitHub)', () => {
  it('valida el formato owner/repo (AC-4)', async () => {
    await expect(jackRemote('no-es-owner-repo', '/tmp')).rejects.toThrow(/formato|owner\/repo/i)
  })

  it('repo inexistente → error (AC-4)', async () => {
    // mock del fetch de verificación para que devuelva 404
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(jackRemote('owner-inexistente/repo-inexistente', '/tmp')).rejects.toThrow(/no existe|404/i)
    vi.unstubAllGlobals()
  })
})
