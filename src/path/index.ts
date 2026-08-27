/**
 * rol: path — shortest-path entre dos símbolos (features/path.feature).
 * LA VISION (gap Graphify: `graphify path A B`): el agente entiende cómo se
 * conecta X con Y. BFS sobre el grafo indexado (reutiliza index.db, no re-indexa).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero trazar el camino más corto entre dos símbolos,
 *   para entender cómo se conecta X con Y.
 *
 * AC (features/path.feature):
 *   AC-1 shortestPath(dir, from, to) → lista de nodos (BFS).
 *   AC-2 sin camino → [].
 *   AC-3 determinista.
 *   AC-4 reutiliza el grafo indexado.
 */
import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** rol: shortest-path BFS entre dos símbolos (AC-1..4). Lee del index.db (no re-indexa). */
export async function shortestPath(projectDir: string, from: string, to: string): Promise<string[]> {
  const path = join(projectDir, '.netrunner', 'index.db')
  if (!existsSync(path)) return [] // AC-2
  let nodes: Array<{ id: string }> = []
  let edges: Array<{ from: string; to: string }> = []
  try {
    const db = new Database(path)
    nodes = db.query('SELECT id FROM nodes').all() as Array<{ id: string }>
    edges = db.query('SELECT "from", "to" FROM edges').all() as Array<{ from: string; to: string }>
    db.close()
  } catch {
    return []
  }
  // resolver símbolos a IDs de nodo, priorizando definiciones (def:) sobre imports
  const resolve = (sym: string): string | null => {
    const def = nodes.find((n) => n.id.startsWith('def:') && n.id.endsWith(`:${sym}`))
    if (def) return def.id
    const exact = nodes.find((n) => n.id === sym || n.id.endsWith(`:${sym}`))
    return exact?.id ?? null
  }
  const fromId = resolve(from)
  const toId = resolve(to)
  if (!fromId || !toId) return [] // AC-2
  // construir el grafo de adyacencia NO DIRIGIDO (cómo se conecta X con Y, en ambas direcciones)
  const nameToId = new Map<string, string>()
  for (const n of nodes) {
    if (n.id.startsWith('def:')) nameToId.set(n.id.split(':').pop() ?? n.id, n.id)
  }
  const adj = new Map<string, string[]>()
  const addEdge = (a: string, b: string): void => {
    if (!adj.has(a)) adj.set(a, [])
    adj.get(a)!.push(b)
  }
  for (const e of edges) {
    const fromName = e.from.split(':').pop() ?? e.from
    const destName = e.to.split(':').pop() ?? e.to
    const from = nameToId.get(fromName) ?? e.from
    const dest = nameToId.get(destName) ?? e.to
    addEdge(from, dest)
    addEdge(dest, from) // no dirigido
  }
  // BFS
  const queue: string[] = [fromId]
  const visited = new Set<string>([fromId])
  const parent = new Map<string, string | null>([[fromId, null]])
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur === toId) {
      // reconstruir el camino (nombres simples, no IDs)
      const path: string[] = []
      let node: string | null = toId
      while (node !== null) {
        path.unshift(node.split(':').pop() ?? node)
        node = parent.get(node) ?? null
      }
      return path
    }
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        parent.set(next, cur)
        queue.push(next)
      }
    }
  }
  return [] // AC-2
}
