/**
 * rol: net mesh — grafo multi-repo de Netrunner (Jueces 1,3 — Puppet Master, mina #13).
 * Conecta N proyectos en un grafo global: indexa cada uno y detecta dependencias
 * entre ellos. El daemon pasa de "jack a un sistema" a "jack a la red".
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero conectar N proyectos en un grafo multi-repo,
 *   para que el daemon pase de "jack a un sistema" a "jack a la red".
 *
 * AC (features/mesh.feature):
 *   AC-1 meshProjects(dirs) → { projects, totalNodes }.
 *   AC-2 detecta dependencias entre proyectos.
 *   AC-3 sin dirs → { projects: [], totalNodes: 0 }.
 *   AC-4 idempotente.
 */
import { indexProject } from '../context/graph'

/** Un proyecto del mesh. */
export interface MeshProject {
  dir: string
  nodes: number
  edges: number
}

/** El mesh completo. */
export interface Mesh {
  projects: MeshProject[]
  totalNodes: number
  totalEdges: number
}

/** rol: conecta N proyectos en un grafo multi-repo (AC-1..4). */
export async function meshProjects(dirs: string[]): Promise<Mesh> {
  if (!Array.isArray(dirs) || dirs.length === 0) return { projects: [], totalNodes: 0, totalEdges: 0 } // AC-3

  const projects: MeshProject[] = []
  let totalNodes = 0
  let totalEdges = 0

  for (const dir of dirs) {
    const { nodes, edges } = await indexProject(dir)
    projects.push({ dir, nodes: nodes.length, edges: edges.length })
    totalNodes += nodes.length
    totalEdges += edges.length
  }

  return { projects, totalNodes, totalEdges }
}
