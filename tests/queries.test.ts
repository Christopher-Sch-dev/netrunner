/**
 * role: TDD tests for src/context/queries.ts — SQLite graph queries (AC-5).
 *
 * SPEC:
 *   As an agent operating a project,
 *   I want to query the knowledge graph indexed in <project>/.netrunner/index.db
 *   to answer (explore/callers/callees/impact) in few calls, without massive grep/read.
 *
 * AC (Acceptance Criteria):
 *   AC-5.1 explore(name) returns the nodes whose name matches (LIKE) + the edges that connect them.
 *   AC-5.2 callers(symbolId) returns who calls a symbol (edges with to=symbolId) + caller nodes.
 *   AC-5.3 callees(symbolId) returns who a symbol calls (edges with from=symbolId) + callee nodes.
 *   AC-5.4 impact(symbolId, depth) returns the blast radius bounded by BFS of depth depth.
 *   AC-5.5 Every query truncates to 100 nodes max and sets truncated=true if there are more.
 *
 * GHERKIN:
 *   GIVEN an index.db with indexed nodes/edges
 *   WHEN  I query explore/callers/callees/impact
 *   THEN  it returns the expected nodes and edges, truncating to 100 and marking truncated.
 */
import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Fake bun:sqlite.Database backed by node:sqlite (same prepare().get/all/run API).
// Lets the source use bun:sqlite (bun runtime) while vitest runs under node.
vi.mock('bun:sqlite', () => ({
  Database: class {
    private db: DatabaseSync
    constructor(path: string) {
      this.db = new DatabaseSync(path)
    }
    prepare(sql: string) {
      return this._stmt(sql)
    }
    query(sql: string) {
      return this._stmt(sql)
    }
    private _stmt(sql: string) {
      return {
        get: (...args: (string | number)[]) => this.db.prepare(sql).get(...args),
        all: (...args: (string | number)[]) => this.db.prepare(sql).all(...args),
        run: (...args: (string | number)[]) => this.db.prepare(sql).run(...args),
      }
    }
    close() {
      this.db.close()
    }
  },
}))

// role: creates a temporary project with a seeded index.db (same schema as graph.ts).
function seedProject(nodes: [string, string, string][], edges: [string, string, string, string][]) {
  const dir = mkdtempSync(join(tmpdir(), 'netrunner-q-'))
  const netDir = join(dir, '.netrunner')
  mkdirSync(netDir, { recursive: true })
  const db = new DatabaseSync(join(netDir, 'index.db'))
  db.exec('CREATE TABLE nodes(id TEXT PRIMARY KEY, name TEXT, kind TEXT, file TEXT, line INTEGER, endLine INTEGER)')
  db.exec('CREATE TABLE edges("from" TEXT, "to" TEXT, kind TEXT, provenance TEXT)')
  const inNode = db.prepare('INSERT INTO nodes(id,name,kind,file,line,endLine) VALUES(?,?,?,?,?,?)')
  for (const [id, name, kind] of nodes) inNode.run(id, name, kind, `${name}.ts`, 1, 2)
  const inEdge = db.prepare('INSERT INTO edges("from","to",kind,provenance) VALUES(?,?,?,?)')
  for (const [from, to, kind, prov] of edges) inEdge.run(from, to, kind, prov)
  db.close()
  return dir
}

const { explore, callers, callees, impact } = await import('../src/context/queries')

describe('src/context/queries (grafo SQLite, AC-5)', () => {
  it('explore: devuelve nodos cuyo nombre matchea (LIKE) y los edges que los conectan', async () => {
    const dir = seedProject(
      [
        ['def:auth.login', 'login', 'function'],
        ['def:auth.logout', 'logout', 'function'],
        ['def:user.service', 'service', 'const'],
      ],
      [
        ['def:user.service', 'def:auth.login', 'calls', 'EXTRACTED'],
        ['def:auth.login', 'def:auth.logout', 'calls', 'EXTRACTED'],
      ],
    )
    try {
      const res = await explore('login', dir)
      expect(res.nodes.map((n) => n.name)).toEqual(['login'])
      expect(res.truncated).toBe(false)
      // the edge that connects to login (user.service→login and login→logout)
      expect(res.edges.length).toBe(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('explore: truncated=true cuando hay más de 100 nodos matcheando', async () => {
    const nodes: [string, string, string][] = []
    for (let i = 0; i < 120; i++) nodes.push([`def:f${i}`, `fn${i}`, 'function'])
    const dir = seedProject(nodes, [])
    try {
      const res = await explore('fn', dir)
      expect(res.nodes.length).toBe(100)
      expect(res.truncated).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('callers: devuelve quién llama al símbolo (edges to=symbolId + nodos caller)', async () => {
    const dir = seedProject(
      [
        ['def:app', 'app', 'const'],
        ['def:util', 'util', 'const'],
        ['def:core', 'core', 'const'],
      ],
      [
        ['def:app', 'def:core', 'calls', 'EXTRACTED'],
        ['def:util', 'def:core', 'calls', 'EXTRACTED'],
        ['def:core', 'def:other', 'calls', 'EXTRACTED'],
      ],
    )
    try {
      const res = await callers('def:core', dir)
      expect(res.nodes.map((n) => n.id).sort()).toEqual(['def:app', 'def:util'])
      expect(res.edges.length).toBe(2)
      expect(res.truncated).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('callees: devuelve a quién llama el símbolo (edges from=symbolId + nodos callee)', async () => {
    const dir = seedProject(
      [
        ['def:app', 'app', 'const'],
        ['def:a', 'a', 'function'],
        ['def:b', 'b', 'function'],
      ],
      [
        ['def:app', 'def:a', 'calls', 'EXTRACTED'],
        ['def:app', 'def:b', 'calls', 'EXTRACTED'],
        ['def:a', 'def:b', 'calls', 'EXTRACTED'],
      ],
    )
    try {
      const res = await callees('def:app', dir)
      expect(res.nodes.map((n) => n.id).sort()).toEqual(['def:a', 'def:b'])
      expect(res.edges.length).toBe(2)
      expect(res.truncated).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('impact: blast radius por BFS hasta profundidad depth, truncando a 100', async () => {
    // app -> a -> b -> c -> d (chain of 5). depth 2 from app reaches a,b.
    const dir = seedProject(
      [
        ['def:app', 'app', 'const'],
        ['def:a', 'a', 'function'],
        ['def:b', 'b', 'function'],
        ['def:c', 'c', 'function'],
        ['def:d', 'd', 'function'],
      ],
      [
        ['def:app', 'def:a', 'calls', 'EXTRACTED'],
        ['def:a', 'def:b', 'calls', 'EXTRACTED'],
        ['def:b', 'def:c', 'calls', 'EXTRACTED'],
        ['def:c', 'def:d', 'calls', 'EXTRACTED'],
      ],
    )
    try {
      const res = await impact('def:app', dir, 2)
      expect(res.nodes.map((n) => n.id).sort()).toEqual(['def:a', 'def:app', 'def:b'])
      expect(res.edges.length).toBe(2)
      expect(res.truncated).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('impact: truncated=true si el blast radius excede 100 nodos', async () => {
    const edges: [string, string, string, string][] = []
    const nodes: [string, string, string][] = [['def:root', 'root', 'const']]
    for (let i = 0; i < 150; i++) {
      nodes.push([`def:n${i}`, `n${i}`, 'function'])
      edges.push([`def:root`, `def:n${i}`, 'calls', 'EXTRACTED'])
    }
    const dir = seedProject(nodes, edges)
    try {
      const res = await impact('def:root', dir, 1)
      expect(res.nodes.length).toBe(100)
      expect(res.truncated).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
