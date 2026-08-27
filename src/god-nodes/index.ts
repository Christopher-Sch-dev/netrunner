/**
 * rol: god nodes — nodos más conectados del grafo (features/god-nodes.feature).
 * LA VISION (gap Graphify: god nodes / comunidades): el agente entiende la
 * arquitectura del proyecto — qué módulos son el centro (más conectados).
 * Calcula el grado de cada nodo (conexiones) y ordena descendentemente.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero detectar los god nodes del grafo,
 *   para entender la arquitectura del proyecto.
 *
 * AC (features/god-nodes.feature):
 *   AC-1 godNodes(dir) → nodos ordenados por grado.
 *   AC-2 incluye el grado de cada nodo.
 *   AC-3 sin grafo → [].
 *   AC-4 determinista.
 */
import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Un god node. */
export interface GodNode { name: string; degree: number }

/** rol: nodos más conectados del grafo (AC-1..4). Lee del index.db (no re-indexa). */
export async function godNodes(projectDir: string): Promise<GodNode[]> {
  const path = join(projectDir, '.netrunner', 'index.db')
  if (!existsSync(path)) return [] // AC-3
  try {
    const db = new Database(path)
    const nodes = db.query('SELECT id, name FROM nodes').all() as Array<{ id: string; name: string }>
    const edges = db.query('SELECT "from", "to" FROM edges').all() as Array<{ from: string; to: string }>
    db.close()
    if (nodes.length === 0) return []
    // normalizar destinos de edges (rel:a → def:...:a) para contar el grado real
    const nameToId = new Map<string, string>()
    for (const n of nodes) {
      if (n.id.startsWith('def:')) nameToId.set(n.id.split(':').pop() ?? n.id, n.id)
    }
    // contar el grado de cada nodo (conexiones, no dirigido)
    const degree = new Map<string, number>()
    for (const n of nodes) degree.set(n.id, 0)
    for (const e of edges) {
      const fromName = e.from.split(':').pop() ?? e.from
      const destName = e.to.split(':').pop() ?? e.to
      const from = nameToId.get(fromName) ?? e.from
      const dest = nameToId.get(destName) ?? e.to
      degree.set(from, (degree.get(from) ?? 0) + 1)
      degree.set(dest, (degree.get(dest) ?? 0) + 1)
    }
    // ordenar por grado desc (AC-1/4), solo definiciones (def:)
    return nodes
      .filter((n) => n.id.startsWith('def:'))
      .map((n) => ({ name: n.id.split(':').pop() ?? n.name, degree: degree.get(n.id) ?? 0 }))
      .sort((a, b) => b.degree - a.degree)
  } catch {
    return []
  }
}
