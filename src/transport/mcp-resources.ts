/**
 * rol: MCP resources de Netrunner (spec MCP 2026-07-28, Wave 5).
 * Expone el snapshot del proyecto como RECURSOS MCP (`net://meta/*`): el agente
 * obtiene el contexto (rama/stack/coverage/versiones/servicios/pendientes) sin
 * llamar tools. Es la skill auto-generante expuesta al agente vía MCP.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente conectado por MCP a un proyecto Netrunner,
 *   quiero leer el snapshot como recursos net://meta/*,
 *   para obtener el contexto del proyecto sin llamar tools.
 *
 * AC (features/mcp-resources.feature):
 *   AC-1 registerMetaResources(server, dir) registra net://meta/{branch,stack,coverage,versions,services,pending}.
 *   AC-2 cada recurso devuelve el dato del snapshot (texto).
 *   AC-3 recurso desconocido → error; sin snapshot → defaults.
 *   AC-4 reutiliza buildSnapshot.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { buildSnapshot } from '../context/snapshot'

/** rol: registra los recursos meta del snapshot en el server MCP (AC-1/4). */
export function registerMetaResources(server: McpServer, projectDir: string): void {
  const read = async (uri: string) => {
    const snap = await buildSnapshot(projectDir)
    switch (uri) {
      case 'net://meta/branch': return snap.git.branch ?? 'no repo'
      case 'net://meta/stack': return JSON.stringify(snap.stack)
      case 'net://meta/coverage': return `lines:${snap.coverage.lines}% functions:${snap.coverage.functions}%`
      case 'net://meta/versions': return JSON.stringify(snap.versions)
      case 'net://meta/services': return JSON.stringify(snap.services)
      case 'net://meta/pending': return JSON.stringify(snap.todos)
      default: throw new Error(`recurso desconocido: '${uri}'`)
    }
  }

  for (const uri of ['net://meta/branch', 'net://meta/stack', 'net://meta/coverage', 'net://meta/versions', 'net://meta/services', 'net://meta/pending']) {
    server.registerResource(
      uri,
      uri,
      { title: uri, description: `Snapshot del proyecto (${uri})`, mimeType: 'text/plain' },
      async () => ({ contents: [{ uri, mimeType: 'text/plain', text: await read(uri) }] }),
    )
  }
}
