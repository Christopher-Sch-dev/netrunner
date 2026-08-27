/**
 * rol: map — grafo visual de Netrunner (mina cyberpunk feature #3).
 * Exporta el grafo de conocimiento (index.db) a un formato JSON visualizable
 * (D3/mermaid) — la "matrix" de Case. El agente puede "ver" el cyberspace del
 * proyecto, no solo consultarlo por MCP.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero exportar el grafo a formato visual,
 *   para que el cyberspace del proyecto sea visualizable.
 *
 * AC (features/map.feature):
 *   AC-1 exportMap(dir) → { nodes, edges }.
 *   AC-2 cada nodo { id, name, kind, file }; cada edge { from, to, kind }.
 *   AC-3 sin index.db → { nodes: [], edges: [] } (no falla).
 *   AC-4 acotado (máx 200 nodos) para no quemar tokens.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

const LIMIT = 200

/** Nodo del grafo visual. */
export interface MapNode { id: string; name: string; kind: string; file: string }
/** Edge del grafo visual con provenance (anti-alucinación, robar de graphify). */
export interface MapEdge { from: string; to: string; kind: string; provenance: string; file: string }

/** Grafo exportado. */
export interface MapData { nodes: MapNode[]; edges: MapEdge[] }

/** rol: exporta el grafo a JSON visual (determinista, no falla sin index.db). */
export function exportMap(projectDir: string): MapData {
  const path = join(projectDir, '.netrunner', 'index.db')
  if (!existsSync(path)) return { nodes: [], edges: [] }
  try {
    const db = new Database(path)
    const nodes = db.query('SELECT id, name, kind, file FROM nodes LIMIT ?').all(LIMIT) as MapNode[]
    // edges con provenance + file del nodo from (JOIN) — el LLM audita cada afirmación
    const edges = db.query(
      `SELECT e."from", e."to", e.kind,
              CASE WHEN e.provenance = '' THEN 'INFERRED' ELSE e.provenance END AS provenance,
              COALESCE(n.file, '') AS file
       FROM edges e LEFT JOIN nodes n ON n.id = e."from"
       LIMIT ?`,
    ).all(LIMIT) as MapEdge[]
    db.close()
    return { nodes, edges }
  } catch {
    return { nodes: [], edges: [] }
  }
}
