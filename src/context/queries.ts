/**
 * rol: Queries de lectura del grafo de conocimiento de Netrunner (AC-5).
 * Lee el index.db de un proyecto (<proyecto>/.netrunner/index.db) vía bun:sqlite
 * y devuelve QueryResult. NO depende de detect.ts ni graph.ts (otras waves):
 * define la interfaz de lectura sobre el mismo schema que graph.ts indexa.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto,
 *   quiero consultar el grafo indexado (explore/callers/callees/impact)
 *   para responder en pocas llamadas sin grep/read masivo.
 *
 * AC:
 *   AC-5.1 explore(name) → nodos cuyo nombre matchea (LIKE) + edges que los conectan.
 *   AC-5.2 callers(symbolId) → edges con to=symbolId (quién llama) + nodos caller.
 *   AC-5.3 callees(symbolId) → edges con from=symbolId (a quién llama) + nodos callee.
 *   AC-5.4 impact(symbolId, depth) → blast radius por BFS acotado por depth.
 *   AC-5.5 Toda query trunca a 100 nodos máx y marca truncated=true si hubo más.
 *
 * GHERKIN:
 *   GIVEN un index.db con tablas nodes(id,name,kind,file,line,endLine)
 *         y edges(from,to,kind,provenance)
 *   WHEN  consulto explore/callers/callees/impact
 *   THEN  devuelve QueryResult con nodos+edges esperados, truncado a 100.
 */
import { Database } from 'bun:sqlite'
import type { GraphEdge, GraphNode, QueryResult } from './types'

/** Máximo de nodos devueltos por query (blast radius acotado, AC-5.5). */
const LIMIT = 100

/** Abre el index.db del proyecto (ruta estándar definida por graph.ts). */
function openDb(projectDir: string): Database {
  return new Database(`${projectDir}/.netrunner/index.db`)
}

/** Convierte una fila de la tabla nodes en GraphNode tipado. */
function toNode(row: Record<string, unknown>): GraphNode {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind),
    file: String(row.file),
    line: Number(row.line),
    endLine: Number(row.endLine),
  }
}

/** Convierte una fila de la tabla edges en GraphEdge tipado. */
function toEdge(row: Record<string, unknown>): GraphEdge {
  return {
    from: String(row.from),
    to: String(row.to),
    kind: String(row.kind),
    provenance: row.provenance === 'EXTRACTED' ? 'EXTRACTED' : 'INFERRED',
  }
}

/** Devuelve true si el conjunto superó el límite (leímos LIMIT+1 filas). */
function isTruncated<T>(rows: T[]): boolean {
  return rows.length > LIMIT
}

/** Consulta nodos por ids, respetando el orden dado (LIMIT acotado). */
function nodesByIds(db: Database, ids: string[]): GraphNode[] {
  const stmt = db.query('SELECT * FROM nodes WHERE id = ?')
  return ids.slice(0, LIMIT).map((id) => toNode(stmt.get(id) as Record<string, unknown>))
}

/** Consulta edges que tocan un conjunto de nodos (from O to en ids), dedup. */
function edgesAmong(db: Database, ids: string[]): GraphEdge[] {
  const seen = new Set(ids)
  const stmt = db.query('SELECT * FROM edges WHERE "from" = ? OR "to" = ?')
  const rows: Record<string, unknown>[] = []
  for (const id of ids.slice(0, LIMIT)) {
    rows.push(...(stmt.all(id, id) as Record<string, unknown>[]))
  }
  const dedup = new Set<string>()
  return rows
    .filter((r) => seen.has(String(r.from)) || seen.has(String(r.to)))
    .filter((r) => {
      const key = `${r.from}:${r.to}:${r.kind}`
      if (dedup.has(key)) return false
      dedup.add(key)
      return true
    })
    .map(toEdge)
}

/** EXPLORE: nodos cuyo nombre matchea (LIKE) + edges que los conectan. */
export async function explore(name: string, projectDir: string): Promise<QueryResult> {
  // auto-index si no hay index.db o si el grafo está stale (fix juez de casos borde + auditor de visión)
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  if (!existsSync(join(projectDir, '.netrunner', 'index.db'))) {
    const { indexProject } = await import('./graph')
    await indexProject(projectDir)
  } else {
    // grafo existe pero puede estar stale → syncIfNeeded (idempotente, solo si cambió)
    const { syncIfNeeded } = await import('./sync')
    await syncIfNeeded(projectDir)
  }
  const db = openDb(projectDir)
  try {
    const pattern = `%${name}%`
    const rows = db.query('SELECT * FROM nodes WHERE name LIKE ? LIMIT ?').all(pattern, LIMIT + 1) as Record<string, unknown>[]
    const nodes = rows.slice(0, LIMIT).map(toNode)
    const ids = nodes.map((n) => n.id)
    return { nodes, edges: edgesAmong(db, ids), truncated: isTruncated(rows) }
  } finally {
    db.close()
  }
}

/** CALLERS: quién llama a un símbolo (edges to=symbolId) + nodos caller. */
export async function callers(symbolId: string, projectDir: string): Promise<QueryResult> {
  const db = openDb(projectDir)
  try {
    const rows = db.query('SELECT * FROM edges WHERE "to" = ? LIMIT ?').all(symbolId, LIMIT + 1) as Record<string, unknown>[]
    const edges = rows.slice(0, LIMIT).map(toEdge)
    const callerIds = edges.map((e) => e.from)
    return { nodes: nodesByIds(db, callerIds), edges, truncated: isTruncated(rows) }
  } finally {
    db.close()
  }
}

/** CALLEES: a quién llama un símbolo (edges from=symbolId) + nodos callee. */
export async function callees(symbolId: string, projectDir: string): Promise<QueryResult> {
  const db = openDb(projectDir)
  try {
    const rows = db.query('SELECT * FROM edges WHERE "from" = ? LIMIT ?').all(symbolId, LIMIT + 1) as Record<string, unknown>[]
    const edges = rows.slice(0, LIMIT).map(toEdge)
    const calleeIds = edges.map((e) => e.to)
    return { nodes: nodesByIds(db, calleeIds), edges, truncated: isTruncated(rows) }
  } finally {
    db.close()
  }
}

/** rol: expande el blast radius BFS acotado por depth, truncado a LIMIT (AC-5.4). */
function expandBfs(
  db: Database,
  symbolId: string,
  depth: number,
): { nodes: GraphNode[]; edges: GraphEdge[]; truncated: boolean } {
  const outStmt = db.query('SELECT * FROM edges WHERE "from" = ?')
  const outEdges = (id: string) => outStmt.all(id) as Record<string, unknown>[]
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const visited = new Set<string>([symbolId])
  let frontier = [symbolId]
  let truncated = false

  for (let level = 0; level <= depth; level++) {
    const next: string[] = []
    for (const id of frontier) {
      if (nodes.length >= LIMIT) { truncated = true; break }
      nodes.push(...nodesByIds(db, [id]))
      // solo expande edges hacia el siguiente nivel si no es la última capa
      if (level >= depth) continue
      const found = outEdges(id) as Record<string, unknown>[]
      for (const row of found) {
        const edge = toEdge(row)
        if (!visited.has(edge.to)) {
          visited.add(edge.to)
          next.push(edge.to)
        }
        edges.push(edge)
      }
    }
    if (truncated) break
    frontier = next
    if (frontier.length === 0) break
  }
  return { nodes, edges, truncated }
}

/** IMPACT: blast radius por BFS acotado por depth (default 2), truncado a 100. */
export async function impact(symbolId: string, projectDir: string, depth = 2): Promise<QueryResult> {
  const db = openDb(projectDir)
  try {
    return expandBfs(db, symbolId, depth)
  } finally {
    db.close()
  }
}
