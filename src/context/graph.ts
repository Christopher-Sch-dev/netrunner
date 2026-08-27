/**
 * rol: Netrunner knowledge-graph indexer (AC-1/AC-5).
 * Walks a project's source files, extracts symbols/calls/imports
 * with parse.ts (tree-sitter wasm) and persists them in a local graph
 * (<project>/.netrunner/index.db) using bun:sqlite (Bun runtime; vitest mocks it).
 * queries.ts reads this index.db with the same schema.
 *
 * SPEC (Mandamiento 0):
 *   As an agent operating a project,
 *   I want to index its definitions/calls/imports into a persistent graph,
 *   so that the queries (explore/callers/callees/impact) answer in few
 *   calls without massive grep/read.
 *
 * AC (features/graph.feature):
 *   AC-G1 creates tables nodes(id,name,kind,file,line,endLine) and edges(from,to,kind,provenance).
 *   AC-G2 extracts definitions→GraphNode and imports/calls→GraphEdge (EXTRACTED/INFERRED).
 *   AC-G3 incremental: only re-indexes files whose mtime changed.
 *   AC-G4 returns { nodes, edges } totals.
 */
import { Database, type Statement } from 'bun:sqlite'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import type { GraphEdge, GraphNode } from './types'
import { parseFile, type ParsedSymbol, type ParsedImport, type ParsedCall } from './parse'
import { loadGitignore, isIgnored } from './gitignore'

/** Maps extension → tree-sitter language (same as parse.ts). */
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'tsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  // Wave E2: más lenguajes de grafo (Java/C#/PHP/Ruby)
  '.java': 'java',
  '.cs': 'c_sharp',
  '.php': 'php',
  '.rb': 'ruby',
}

/** Paths/dirs to ignore when indexing (deterministic, avoids noise). */
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage',
  '.next', '.nuxt', 'vendor', '.venv', 'target', '.onyx', '.doc', '.engram',
  '.stryker-tmp', // the mutation-testing sandbox creates copies → collide IDs (Bug A)
])

const IGNORED_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'])

/** rol: returns the list of source files to index (deterministic). */
function sourceFiles(root: string): string[] {
  const out: string[] = []
  // respetar el .gitignore del proyecto (gap Cris + Graphify): no indexar lo ignorado
  const gitignorePatterns = loadGitignore(root)
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const rel = join(dir, e.name).replace(root + '/', '')
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name) && !isIgnored(rel, gitignorePatterns)) walk(join(dir, e.name))
      } else if (e.isFile() && !IGNORED_FILES.has(e.name)) {
        // BUG 1 (auditor): respetar .gitignore a nivel de ARCHIVO también (no solo directorios)
        if (isIgnored(rel, gitignorePatterns)) continue
        const ext = extname(e.name)
        if (EXT_TO_LANG[ext]) out.push(join(dir, e.name))
      }
    }
  }
  walk(root)
  return out
}

/** rol: creates the schema (CREATE TABLE IF NOT EXISTS) if it does not exist. */
function ensureSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,
      file TEXT NOT NULL, line INTEGER NOT NULL, endLine INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS edges (
      "from" TEXT NOT NULL, "to" TEXT NOT NULL, kind TEXT NOT NULL,
      provenance TEXT NOT NULL,
      PRIMARY KEY ("from", "to", kind)
    );
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges("from");
    CREATE INDEX IF NOT EXISTS idx_edges_to ON edges("to");
  `)
  // DEC-011: columna `file` en edges para stale-edge pruning (patrón Graphify source_file).
  // Idempotente: si ya existe, ALTER falla y se ignora (migración de DBs previas).
  try {
    db.exec('ALTER TABLE edges ADD COLUMN file TEXT')
  } catch { /* columna ya existe */ }
}

/** rol: persists defs/imports/calls of a parsed file into the graph (AC-G2/G3). */
function applyParsed(
  parsed: { defs: ParsedSymbol[]; imports: ParsedImport[]; calls: ParsedCall[] },
  rel: string,
  nodeInsert: Statement,
  edgeInsert: Statement,
  nodes: GraphNode[],
  edges: GraphEdge[],
): void {
  for (const def of parsed.defs) {
    // per-file namespacing: def:<rel_path>:<name> (Bug A — avoids collisions between files)
    const id = `def:${rel}:${def.name}`
    nodeInsert.run(id, def.name, def.kind, rel, def.line, def.endLine)
    nodes.push({ id, name: def.name, kind: def.kind, file: rel, line: def.line, endLine: def.endLine })
  }
  for (const imp of parsed.imports) {
    const impId = `import:${rel}:${imp.name}`
    nodeInsert.run(impId, imp.name, 'import', rel, 0, 0)
    nodes.push({ id: impId, name: imp.name, kind: 'import', file: rel, line: 0, endLine: 0 })
    const toId = `mod:${imp.source}`
    edgeInsert.run(impId, toId, 'imports', 'EXTRACTED', rel)
    edges.push({ from: impId, to: toId, kind: 'imports', provenance: 'EXTRACTED' })
  }
  for (const call of parsed.calls) {
    if (!call.caller) continue
    const from = `rel:${rel}:${call.caller}`
    const to = `rel:${call.callee}`
    edgeInsert.run(from, to, 'calls', 'EXTRACTED', rel)
    edges.push({ from, to, kind: 'calls', provenance: 'EXTRACTED' })
  }
}

/**
 * rol: indexes the project and persists the graph in <project>/.netrunner/index.db.
 * incremental=true: only re-indexes files whose mtime changed (index_meta table).
 * Idempotent: re-running does not duplicate.
 *
 * DEC-011 (Wave F1 — incremental edge-level update):
 *  - Stale node/edge pruning: al re-extraer un archivo cambiado, borra sus nodos/edges
 *    ANTES de re-insertar (evicta símbolos/llamadas eliminados — patrón Graphify source_file).
 *  - Deleted-file eviction: archivos en index_meta que ya no existen en el filesystem
 *    → se borran sus nodos/edges/meta (patrón CodeGraph delete_file_entities).
 *  - Retorno aditivo: `{ nodes, edges }` = total indexado (no rompe callers existentes);
 *    `changed: { nodes, edges }` = delta de la corrida (solo archivos afectados).
 */
export async function indexProject(
  projectDir: string,
  options: { incremental?: boolean } = {},
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; changed: { nodes: GraphNode[]; edges: GraphEdge[] } }> {
  const { incremental = false } = options
  const dbDir = join(projectDir, '.netrunner')
  const { mkdirSync } = await import('node:fs')
  try { mkdirSync(dbDir, { recursive: true }) } catch { /* already exists */ }

  const db = new Database(join(dbDir, 'index.db'))
  ensureSchema(db)

  db.exec('CREATE TABLE IF NOT EXISTS index_meta (file TEXT PRIMARY KEY, mtime REAL)')
  const getMeta = db.prepare('SELECT mtime FROM index_meta WHERE file = ?')
  const upsertMeta = db.prepare(
    'INSERT INTO index_meta (file, mtime) VALUES (?, ?) ON CONFLICT(file) DO UPDATE SET mtime = excluded.mtime',
  )
  const deleteMeta = db.prepare('DELETE FROM index_meta WHERE file = ?')
  const deleteNodesByFile = db.prepare('DELETE FROM nodes WHERE file = ?')
  const deleteEdgesByFile = db.prepare('DELETE FROM edges WHERE file = ?')

  const files = sourceFiles(projectDir)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const changedNodes: GraphNode[] = []
  const changedEdges: GraphEdge[] = []
  const nodeInsert = db.prepare(
    'INSERT OR REPLACE INTO nodes (id, name, kind, file, line, endLine) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const edgeInsert = db.prepare(
    'INSERT OR IGNORE INTO edges ("from", "to", kind, provenance, file) VALUES (?, ?, ?, ?, ?)',
  )

  for (const abs of files) {
    const stat = statSync(abs)
    const mtime = stat.mtimeMs
    if (incremental) {
      const meta = getMeta.get(abs) as { mtime: number } | undefined
      if (meta && meta.mtime === mtime) continue // no changes
    }

    const rel = relative(projectDir, abs)
    const ext = extname(abs)
    const lang = EXT_TO_LANG[ext]
    const code = readFileSync(abs, 'utf8')
    const parsed = await parseFile(code, lang)

    // DEC-011: stale pruning — evicta nodos/edges del archivo antes de re-insertar
    // (patrón Graphify source_file: evita phantom dependencies y símbolos eliminados).
    deleteNodesByFile.run(rel)
    deleteEdgesByFile.run(rel)

    const nodesBefore = nodes.length
    const edgesBefore = edges.length
    applyParsed(parsed, rel, nodeInsert, edgeInsert, nodes, edges)
    changedNodes.push(...nodes.slice(nodesBefore))
    changedEdges.push(...edges.slice(edgesBefore))
    upsertMeta.run(abs, mtime)
  }

  // DEC-011: deleted-file eviction — archivos indexados que ya no existen en el filesystem
  // (patrón CodeGraph delete_file_entities). Solo en incremental (full re-indexa todo).
  if (incremental) {
    const allMeta = db.query('SELECT file FROM index_meta').all() as { file: string }[]
    const live = new Set(files)
    for (const row of allMeta) {
      if (!live.has(row.file)) {
        const rel = relative(projectDir, row.file)
        deleteNodesByFile.run(rel)
        deleteEdgesByFile.run(rel)
        deleteMeta.run(row.file)
      }
    }
  }

  // fix auditor (bugs 4/5): normalizar AMBOS extremos de edges a IDs de nodos reales.
  // Los edges apuntan a rel:<name>/mod:<path> que no son nodos → callers/impact/graph-report
  // no matchean. Borra el edge viejo + inserta el normalizado (ON CONFLICT IGNORE evita
  // duplicados que violan UNIQUE(from,to,kind)).
  const allNodes = db.query('SELECT id, name FROM nodes').all() as { id: string; name: string }[]
  const nameToDef = new Map<string, string>()
  for (const n of allNodes) {
    if (n.id.startsWith('def:')) nameToDef.set(n.name, n.id)
  }
  const allEdges = db.query('SELECT "from", "to", kind, provenance, file FROM edges').all() as { from: string; to: string; kind: string; provenance: string; file: string | null }[]
  const delEdge = db.prepare('DELETE FROM edges WHERE "from" = ? AND "to" = ? AND kind = ?')
  const insEdge = db.prepare('INSERT OR IGNORE INTO edges ("from", "to", kind, provenance, file) VALUES (?, ?, ?, ?, ?)')
  for (const e of allEdges) {
    const fromName = e.from.split(':').pop() ?? e.from
    const destName = e.to.split(':').pop() ?? e.to
    const fromDef = nameToDef.get(fromName)
    const toDef = nameToDef.get(destName)
    const newFrom = fromDef ?? e.from
    const newTo = toDef ?? e.to
    if (newFrom !== e.from || newTo !== e.to) {
      delEdge.run(e.from, e.to, e.kind)
      insEdge.run(newFrom, newTo, e.kind, e.provenance, e.file)
    }
  }

  db.close()
  return { nodes, edges, changed: { nodes: changedNodes, edges: changedEdges } }
}
