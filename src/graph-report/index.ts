/**
 * rol: graph-report — dashboard humano del grafo (features/graph-report.feature).
 * LA VISION (gap Graphify: GRAPH_REPORT.md): el humano ve el "dashboard" del
 * proyecto — god nodes, resumen del grafo. Reutiliza godNodes + exportMap.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero generar un reporte markdown del grafo,
 *   para que el humano vea el dashboard del proyecto.
 *
 * AC (features/graph-report.feature):
 *   AC-1 graphReport(dir) → markdown con god nodes + resumen.
 *   AC-2 incluye nodos/edges.
 *   AC-3 sin grafo → ''.
 *   AC-4 determinista.
 */
/** rol: genera el reporte markdown del grafo (AC-1..4). Lee del index.db (no re-indexa). */
export async function graphReport(projectDir: string): Promise<string> {
  const { Database } = await import('bun:sqlite')
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const path = join(projectDir, '.netrunner', 'index.db')
  if (!existsSync(path)) return '' // AC-3
  let nodes: Array<{ id: string; name: string }> = []
  let edges: Array<{ from: string; to: string }> = []
  try {
    const db = new Database(path)
    nodes = db.query('SELECT id, name FROM nodes').all() as Array<{ id: string; name: string }>
    edges = db.query('SELECT "from", "to" FROM edges').all() as Array<{ from: string; to: string }>
    db.close()
  } catch {
    return ''
  }
  if (nodes.length === 0) return ''
  // calcular god nodes desde los edges del index.db (ya normalizados)
  const degree = new Map<string, number>()
  for (const n of nodes) degree.set(n.id, 0)
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const gods = nodes
    .filter((n) => n.id.startsWith('def:'))
    .map((n) => ({ name: n.id.split(':').pop() ?? n.name, degree: degree.get(n.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree)
  const lines = [
    '# Graph Report',
    '',
    `- **Nodes**: ${nodes.length}`,
    `- **Edges**: ${edges.length}`,
    '',
    '## God Nodes',
    '',
    ...gods.slice(0, 10).map((g) => `- **${g.name}** (${g.degree} connections)`),
    '',
  ]
  return lines.join('\n')
}
