/**
 * rol: init — conecta el proyecto con el agente (AC-1 de features/vision.feature).
 * LA VISION: init no solo indexa el grafo, también genera el conectable layer
 * (mcp.json + SKILL.md + AGENTS.md) para que cualquier agente pueda operar el
 * proyecto. "Plug any project into any agent" de un solo comando.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que init indexe Y genere el conectable layer,
 *   para que el proyecto quede agente-operable de un solo comando (AC-1).
 *
 * AC (features/vision.feature):
 *   AC-1.1 init genera mcp.json + SKILL.md + AGENTS.md.
 *   AC-1.2 idempotente (re-init no duplica).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { indexProject } from './context/graph'
import { install } from './install'

/** Genera/actualiza AGENTS.md del proyecto (si no existe, para no pisar el del usuario). */
function writeAgents(projectDir: string): string {
  const path = join(projectDir, 'AGENTS.md')
  if (existsSync(path)) return path // no pisar AGENTS.md existente del usuario
  const content = `# AGENTS — this project is agent-operable

This project is wired to **Netrunner**, the universal agent motor. Any agent can understand and operate this project with one command:

- \`netrunner status\` — live snapshot: stack, git, versions, coverage, services, TODOs
- \`netrunner explore <sym>\` — find a symbol and its callers
- \`netrunner plan "<goal>"\` — generate a plan from the code graph
- \`netrunner map\` — export the graph (D3/mermaid visualizable)
- \`netrunner dump\` — list every tool the agent can call

Every command returns clean JSON (agent-parseable, no hallucination) with a \`_meta.schemaVersion\`.
`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return path
}

/**
 * rol: init un proyecto (indexa + conectable layer). Idempotente (AC-1.2).
 * Devuelve qué se generó (TOON).
 */
export async function initProject(projectDir: string): Promise<{
  counts: { nodes: number; edges: number }
  written: string[]
}> {
  // 1. indexa el grafo
  const { nodes, edges } = await indexProject(projectDir)
  const counts = { nodes: nodes.length, edges: edges.length }

  // 2. conectable layer (reusa install para no duplicar, Mandamiento 1)
  const written: string[] = []
  try {
    const inst = install('mcp', projectDir)
    written.push(...inst.written)
  } catch { /* install puede fallar si no hay binario — no rompe init */ }

  // 3. AGENTS.md (si no existe)
  const agents = writeAgents(projectDir)
  written.push(agents)

  // 4. canon de documentación viva (README.generated.md + AGENTS.md actualizado)
  //    La marca de NetRunner queda DOCUMENTADA en el proyecto (visión de Cris).
  const { generateDocs } = await import('./generate/index')
  const docs = await generateDocs(projectDir)
  written.push(...docs.written)

  return { counts, written }
}
