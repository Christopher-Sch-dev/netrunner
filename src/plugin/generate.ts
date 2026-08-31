/**
 * rol: Generator de Agent Plugin 1.0.0 de Netrunner (w4a3).
 * Genera el empaque "build once, run anywhere" (agent-plugins.org): plugin.json
 * + skills/netrunner/SKILL.md (playbook del contrato) + mcp.json (wiring).
 * El plugin es la pieza que SE DISTRIBUYE/VENDE (skill agent-plugin-builder).
 *
 * SPEC (Mandamiento 0):
 *   Como un cliente que quiere su proyecto operable por cualquier agente,
 *   quiero un Agent Plugin 1.0.0 (plugin.json + skills/ + mcp.json),
 *   para distribuirlo empaquetado (ChatGPT, Codex, Cursor, Copilot).
 *
 * AC (features/plugin.feature):
 *   AC-1 genera plugin.json con $schema agent-plugins.org 1.0.0 + name/version.
 *   AC-2 genera skills/netrunner/SKILL.md (playbook).
 *   AC-3 genera mcp.json (wiring netrunner --mcp).
 *   AC-4 idempotente.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** Plugin mínimo viable Agent Plugins 1.0.0 (validado por skill agent-plugin-builder). */
function pluginJson(name: string, version: string): string {
  return JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name,
    version,
    description: `Netrunner: universal motor that plugs this project into any agent (graph + MCP).`,
    skills: [{ name: 'netrunner', description: 'Operate the project via the knowledge graph.' }],
    mcpServers: { netrunner: { command: 'netrunner', args: ['--mcp'] } },
  }, null, 2)
}

/** Playbook del skill (formato Agent Skills, progressive disclosure). */
function skillContent(name: string): string {
  return `---
name: ${name}
description: Universal motor that plugs this project into any agent. Uses the graph tools (explore/callers/callees/impact) and search.
---
# ${name}

Operate the project deterministically. Connect the MCP server (netrunner --mcp) and use its tools to understand/operate without mass-reading files.
`
}

/** rol: genera el Agent Plugin en <dir>/.netrunner/plugin/. Idempotente. */
export function generatePlugin(name: string, version: string, dir: string): { pluginDir: string; written: string[] } {
  const pluginDir = join(dir, '.netrunner', 'plugin')
  mkdirSync(pluginDir, { recursive: true })

  const pJson = join(pluginDir, 'plugin.json')
  writeFileSync(pJson, pluginJson(name, version))

  const skillPath = join(pluginDir, 'skills', 'netrunner', 'SKILL.md')
  mkdirSync(dirname(skillPath), { recursive: true })
  writeFileSync(skillPath, skillContent(name))

  const mcpPath = join(pluginDir, 'mcp.json')
  writeFileSync(mcpPath, JSON.stringify({ mcpServers: { netrunner: { command: 'netrunner', args: ['--mcp'] } } }, null, 2))

  return { pluginDir, written: ['plugin.json', 'SKILL.md', 'mcp.json'] }
}
