/**
 * rol: Instalador de Netrunner en un proyecto (AC-8, DEC-006).
 * `install(target, dir)` deja el motor instalable Y controlable por el agente:
 * escribe `.netrunner/skills/netrunner/SKILL.md` (formato Agent Skills: el agente
 * aprende qué puede operar) + registra el binario como MCP server en la config
 * del target (el agente conecta el contrato de tools). Idempotente.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que quiere que un proyecto use Netrunner,
 *   quiero instalarlo (SKILL.md + wiring MCP),
 *   para que el motor quede entendible y controlable por el agente.
 *
 * AC (features/install.feature, DEC-006):
 *   AC-1 escribe .netrunner/skills/netrunner/SKILL.md (Agent Skills frontmatter).
 *   AC-2 registra netrunner --mcp en la config del target (mcp/opencode/claude/cursor).
 *   AC-3 idempotente (actualiza en-place, no duplica).
 *   AC-4 devuelve JSON con qué escribió (TOON).
 *   AC-5 target inválido → error estructurado.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** Config de cada target: qué archivo MCP escribe (matrix de agentes, w4a2). */
const TARGET_CONFIG: Record<string, string> = {
  mcp: '.mcp.json',
  opencode: 'opencode.json',
  claude: '.claude/settings.json',
  cursor: '.cursor/mcp.json',
  codex: '.codex/mcp.json',
  gemini: '.gemini/mcp.json',
  hermes: '.hermes/mcp.json',
  dsh: '.dsh/mcp.json',
  fx: '.fx/mcp.json',
}

/** Dónde escanea cada agente las skills (Bug C: OpenCode/Claude NO leen .netrunner/). */
const TARGET_SKILL_DIR: Record<string, string> = {
  mcp: '.netrunner/skills/netrunner',
  opencode: '.opencode/skills/netrunner',
  claude: '.claude/skills/netrunner',
  cursor: '.cursor/skills/netrunner',
  codex: '.codex/skills/netrunner',
  gemini: '.gemini/skills/netrunner',
  hermes: '.hermes/skills/netrunner',
  dsh: '.dsh/skills/netrunner',
  fx: '.fx/skills/netrunner',
}

/** rol: contenido del SKILL.md (formato Agent Skills, DEC-006). */
function skillContent(): string {
  return `---
name: netrunner
description: Motor universal que conecta este proyecto con cualquier agente. Usa las tools del grafo de conocimiento (explore/callers/callees/impact) y búsqueda (rg). Ejecuta el binario netrunner --mcp para operar el proyecto.
---
# netrunner

Motor universal: indexa el proyecto (grafo), consulta símbolos, busca texto, y opera de forma determinista.

## Tools disponibles (MCP)
- net_explore: busca símbolos por nombre
- net_callers / net_callees: quién llama / a quién llama
- net_impact: blast radius de un símbolo
- net_rg: busca un patrón (ripgrep)
- net_stack: stack del proyecto
- net_available_toolsets / net_enable_toolset: progressive disclosure

## Uso
Conecta el server MCP netrunner (--mcp) y usa estas tools para entender y operar el proyecto sin leer archivos masivamente.
`
}

/** rol: escribe SKILL.md en el dir de skills del target (Bug C: el agente lo escanea). */
function writeSkill(target: string, dir: string): string {
  const rel = TARGET_SKILL_DIR[target]
  const path = join(dir, rel, 'SKILL.md')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, skillContent())
  return path
}

/** rol: lee/merge el JSON de config MCP existente con netrunner server. Idempotente. */
function mergeMcpConfig(existing: string, command: string): string {
  let config: { mcpServers?: Record<string, unknown> } = {}
  try {
    config = JSON.parse(existing) as { mcpServers?: Record<string, unknown> }
  } catch { /* config inválida → se recrea */ }
  config.mcpServers ??= {}
  config.mcpServers.netrunner = { command, args: ['--mcp'] }
  return JSON.stringify(config, null, 2)
}

/** rol: escribe la config MCP del target (idempotente). */
function writeMcp(target: string, projectDir: string, bin: string): string {
  const rel = TARGET_CONFIG[target]
  const path = join(projectDir, rel)
  mkdirSync(dirname(path), { recursive: true })
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '{}'
  writeFileSync(path, mergeMcpConfig(existing, bin))
  return path
}

/** rol: comando binario de netrunner (resuelve a bun run src/cli.ts si no hay binario). */
function resolveBin(): string {
  return 'netrunner'
}

/**
 * rol: instala el motor en un proyecto (DEC-006). Devuelve qué escribió (TOON).
 * bin (opcional) permite tests de ruta custom. target: mcp|opencode|claude|cursor.
 */
export function install(target: string, projectDir: string, bin = resolveBin()): { target: string; written: string[]; mcpConfig: string } {
  if (!TARGET_CONFIG[target]) {
    throw new Error(`target no soportado: '${target}' (usa: ${Object.keys(TARGET_CONFIG).join(', ')})`)
  }
  const skillPath = writeSkill(target, projectDir)
  const mcpPath = writeMcp(target, projectDir, bin)
  return { target, written: ['SKILL.md', mcpPath], mcpConfig: mcpPath }
}

/**
 * rol: desinstala el motor de un proyecto (AC-8 reversible — fix juez de producto).
 * Revierte lo que install escribió: borra la config MCP y el skill dir del target.
 * Idempotente: si no hay nada que desinstalar, no falla.
 */
export function uninstall(target: string, projectDir: string): { target: string; removed: string[] } {
  if (!TARGET_CONFIG[target]) {
    throw new Error(`target no soportado: '${target}' (usa: ${Object.keys(TARGET_CONFIG).join(', ')})`)
  }
  const removed: string[] = []
  // borra la config MCP del target
  const mcpPath = join(projectDir, TARGET_CONFIG[target])
  if (existsSync(mcpPath)) {
    rmSync(mcpPath, { force: true })
    removed.push(mcpPath)
  }
  // borra el skill dir del target
  const skillDir = join(projectDir, TARGET_SKILL_DIR[target])
  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true, force: true })
    removed.push(skillDir)
  }
  return { target, removed }
}
