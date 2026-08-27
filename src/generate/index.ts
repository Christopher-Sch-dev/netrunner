/**
 * rol: Generador de doc viva de Netrunner (Wave 6 — skill auto-generante).
 * Genera/actualiza README.generated.md y AGENTS.md desde el snapshot del proyecto
 * (rama, versiones, cobertura, servicios, pendientes). Es la feature de Cris:
 * "forzar la creación de documentación del proyecto, con el agente y automáticamente".
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el motor genere la documentación desde el snapshot,
 *   para que la skill auto-generante documente todo al día.
 *
 * AC (features/generate.feature):
 *   AC-1 generateDocs(dir) → README.generated.md + AGENTS.md.
 *   AC-2 README incluye stack, git, versiones, cobertura, servicios, pendientes.
 *   AC-3 sin snapshot → genera con defaults (no falla).
 *   AC-4 idempotente (sobreescribe).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { buildSnapshot } from '../context/snapshot'

/** rol: genera el markdown del README desde el snapshot. */
function readmeContent(snap: ReturnType<typeof buildSnapshot>): string {
  const lines: string[] = [
    '# Proyecto (generado por Netrunner)',
    '',
    '> Documentación viva auto-generada. No editar a mano.',
    '',
    '## Estado git',
    `- Rama: ${snap.git.branch ?? 'no repo'}`,
    `- Remoto: ${snap.git.remoteUrl ?? 'ninguno'}`,
    '',
    '## Versiones (prod)',
    ...Object.entries(snap.versions.prod).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Cobertura de tests',
    `- Líneas: ${snap.coverage.lines}% · Funciones: ${snap.coverage.functions}%`,
    '',
    '## Servicios',
    ...snap.services.services.map((s) => `- ${s.name}: ${s.url ?? 'sin url'}`),
    '',
    '## Pendientes (TODO/FIXME)',
    ...snap.todos.todos.slice(0, 10).map((t) => `- [${t.tag}] ${t.file}:${t.line} — ${t.text}`),
    '',
  ]
  return lines.join('\n')
}

/** rol: genera AGENTS.md (instrucciones para agentes). */
function agentsContent(): string {
  return `# AGENTS.md (generado por Netrunner)

Este proyecto es operable por agentes de IA vía Netrunner. Conecta el server MCP (netrunner --mcp) y usa sus tools (explore/callers/callees/impact/rg/ops) para entender y operar el proyecto sin leer archivos masivamente.
`
}

/** rol: genera la documentación viva del proyecto (idempotente, AC-4). */
export function generateDocs(projectDir: string): { written: string[] } {
  const snap = buildSnapshot(projectDir)
  const readmePath = join(projectDir, 'README.generated.md')
  const agentsPath = join(projectDir, 'AGENTS.md')
  mkdirSync(dirname(readmePath), { recursive: true })
  writeFileSync(readmePath, readmeContent(snap))
  writeFileSync(agentsPath, agentsContent())
  return { written: ['README.generated.md', 'AGENTS.md'] }
}
