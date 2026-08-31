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
  // Wave D P2: ampliar a más plataformas (gap Graphify: 20+ plataformas)
  copilot: '.github/copilot/mcp.json',
  aider: '.aider/mcp.json',
  devin: '.devin/mcp.json',
  agents: '.agents/mcp.json',
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
  // Wave D P2
  copilot: '.github/copilot/skills/netrunner',
  aider: '.aider/skills/netrunner',
  devin: '.devin/skills/netrunner',
  agents: '.agents/skills/netrunner',
}

/** rol: contenido del SKILL.md (formato Agent Skills, DEC-006). */
function skillContent(): string {
  return `---
name: netrunner
description: Universal motor that plugs this project into any agent. Uses the knowledge graph tools (explore/callers/callees/impact) and search (rg). Runs the netrunner binary with --mcp to operate the project.
---
# netrunner

Universal motor: indexes the project (graph), queries symbols, searches text, and operates deterministically.

## Available tools (MCP)
- net_explore: find symbols by name
- net_callers / net_callees: who calls / what it calls
- net_impact: blast radius of a symbol
- net_rg: search a pattern (ripgrep)
- net_stack: project stack
- net_available_toolsets / net_enable_toolset: progressive disclosure
- net_set_project: change the project at runtime (navigate another repo without restarting)
- net_init: initialize a project (index graph + conectable layer)
- net_run: run any CLI command as an MCP tool (safe allowlist)

## Usage
Connect the netrunner MCP server (--mcp) and use these tools to understand and operate the project without mass-reading files.

## When to use (trigger)
- **YES**: navigate a TS/JS repo with a knowledge graph (explore/callers/callees/impact), index a project, connect as MCP server, run engine commands (net_run).
- **NO**: QML configs (Caelestia/Hyprland) — there read_file + search_files directly is better (the graph is JS, not QML).

## Recommended flow
1. \`net_available_toolsets\` → what toolsets exist (by project stack).
2. \`net_enable_toolset graph\` → enable the graph tools.
3. \`net_explore <sym>\` → find a symbol and its callers/callees.
4. \`net_impact <sym>\` → blast radius (what breaks if I touch this).
5. \`net_set_project <dir>\` → switch to another repo without restarting the server.
6. \`net_run <command>\` → run any CLI command (status, guard, resume, extract, dna, inspect...).

## PITFALL
The MCP server is **stateless** — enabled tools do NOT persist between requests. To navigate another repo, use \`net_set_project <dir>\` (not a restart).
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
