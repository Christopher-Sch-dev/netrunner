/**
 * rol: Indexador del grafo de conocimiento de Netrunner (AC-1/AC-5).
 * Recorre los archivos fuente de un proyecto, extrae símbolos/llamadas/imports
 * con parse.ts (tree-sitter wasm) y los persiste en un grafo local
 * (<proyecto>/.netrunner/index.db) usando bun:sqlite (runtime Bun; vitest lo mockea).
 * queries.ts lee este index.db con el mismo schema.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto,
 *   quiero indexar sus definiciones/llamadas/imports a un grafo persistente,
 *   para que las queries (explore/callers/callees/impact) respondan en pocas
 *   llamadas sin grep/read masivo.
 *
 * AC (features/graph.feature):
 *   AC-G1 crea tablas nodes(id,name,kind,file,line,endLine) y edges(from,to,kind,provenance).
 *   AC-G2 extrae definiciones→GraphNode y imports/llamadas→GraphEdge (EXTRACTED/INFERRED).
 *   AC-G3 incremental: solo re-indexa archivos cuyo mtime cambió.
 *   AC-G4 devuelve { nodes, edges } totales.
 */
import { Database, type Statement } from 'bun:sqlite'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import type { GraphEdge, GraphNode } from './types'
import { parseFile, type ParsedSymbol, type ParsedImport, type ParsedCall } from './parse'

/** Mapea extensión → lenguaje tree-sitter (mismos que parse.ts). */
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
}

/** Rutas/dirs a ignorar al indexar (determinista, evita ruido). */
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage',
  '.next', '.nuxt', 'vendor', '.venv', 'target', '.onyx', '.doc', '.engram',
  '.stryker-tmp', // Stryker crea copias de sandbox → colisionan IDs (Bug A)
])

const IGNORED_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'])

/** rol: devuelve la lista de archivos fuente a indexar (determinista). */
function sourceFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile() && !IGNORED_FILES.has(e.name)) {
        const ext = extname(e.name)
        if (EXT_TO_LANG[ext]) out.push(join(dir, e.name))
      }
    }
  }
  walk(root)
  return out
}

/** rol: crea el schema (CREATE TABLE IF NOT EXISTS) si no existe. */
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
}

/** rol: persiste defs/imports/calls de un archivo parseado en el grafo (AC-G2/G3). */
function applyParsed(
  parsed: { defs: ParsedSymbol[]; imports: ParsedImport[]; calls: ParsedCall[] },
  rel: string,
  nodeInsert: Statement,
  edgeInsert: Statement,
  nodes: GraphNode[],
  edges: GraphEdge[],
): void {
  for (const def of parsed.defs) {
    // namespacing por archivo: def:<rel_path>:<name> (Bug A — evita colisión entre archivos)
    const id = `def:${rel}:${def.name}`
    nodeInsert.run(id, def.name, def.kind, rel, def.line, def.endLine)
    nodes.push({ id, name: def.name, kind: def.kind, file: rel, line: def.line, endLine: def.endLine })
  }
  for (const imp of parsed.imports) {
    const impId = `import:${rel}:${imp.name}`
    nodeInsert.run(impId, imp.name, 'import', rel, 0, 0)
    nodes.push({ id: impId, name: imp.name, kind: 'import', file: rel, line: 0, endLine: 0 })
    const toId = `mod:${imp.source}`
    edgeInsert.run(impId, toId, 'imports', 'EXTRACTED')
    edges.push({ from: impId, to: toId, kind: 'imports', provenance: 'EXTRACTED' })
  }
  for (const call of parsed.calls) {
    if (!call.caller) continue
    const from = `rel:${rel}:${call.caller}`
    const to = `rel:${call.callee}`
    edgeInsert.run(from, to, 'calls', 'EXTRACTED')
    edges.push({ from, to, kind: 'calls', provenance: 'EXTRACTED' })
  }
}

/**
 * rol: indexa el proyecto y persiste el grafo en <proyecto>/.netrunner/index.db.
 * incremental=true: solo re-indexa archivos cuyo mtime cambió (tabla index_meta).
 * Idempotente: re-ejecutar no duplica.
 */
export async function indexProject(
  projectDir: string,
  options: { incremental?: boolean } = {},
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const { incremental = false } = options
  const dbDir = join(projectDir, '.netrunner')
  const { mkdirSync } = await import('node:fs')
  try { mkdirSync(dbDir, { recursive: true }) } catch { /* ya existe */ }

  const db = new Database(join(dbDir, 'index.db'))
  ensureSchema(db)

  db.exec('CREATE TABLE IF NOT EXISTS index_meta (file TEXT PRIMARY KEY, mtime REAL)')
  const getMeta = db.prepare('SELECT mtime FROM index_meta WHERE file = ?')
  const upsertMeta = db.prepare(
    'INSERT INTO index_meta (file, mtime) VALUES (?, ?) ON CONFLICT(file) DO UPDATE SET mtime = excluded.mtime',
  )

  const files = sourceFiles(projectDir)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeInsert = db.prepare(
    'INSERT OR REPLACE INTO nodes (id, name, kind, file, line, endLine) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const edgeInsert = db.prepare(
    'INSERT OR IGNORE INTO edges ("from", "to", kind, provenance) VALUES (?, ?, ?, ?)',
  )

  for (const abs of files) {
    const stat = statSync(abs)
    const mtime = stat.mtimeMs
    if (incremental) {
      const meta = getMeta.get(abs) as { mtime: number } | undefined
      if (meta && meta.mtime === mtime) continue // sin cambios
    }

    const rel = relative(projectDir, abs)
    const ext = extname(abs)
    const lang = EXT_TO_LANG[ext]
    const code = readFileSync(abs, 'utf8')
    const parsed = await parseFile(code, lang)

    applyParsed(parsed, rel, nodeInsert, edgeInsert, nodes, edges)
    upsertMeta.run(abs, mtime)
  }

  db.close()
  return { nodes, edges }
}
