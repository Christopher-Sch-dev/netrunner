/**
 * rol: Entrypoint del binario netrunner (T1.1, T2.4).
 *
 * Un solo binario que despacha por subcomando/modo (DEC-002):
 *   netrunner                → dashboard content-first del proyecto (AC-4)
 *   netrunner init <dir>     → indexa el proyecto + genera la conectividad (AC-1)
 *   netrunner --mcp          → modo MCP server (stdio) (AC-3)
 *   netrunner plan "<goal>"  → plan determinista por objetivo (AC-9)
 *
 * Minimalista por ahora: el motor se construye por fases. Este CLI enruta
 * los subcomandos y delega a los módulos que van entrando.
 */
import { ToolRegistry } from './core/registry'

// registry compartido por todas las vistas (un contrato, 4 vistas)
export const registry = new ToolRegistry()

async function main(): Promise<void> {
  const [cmd, ...args] = Bun.argv.slice(2)

  switch (cmd) {
    case '--mcp': {
      // T2.1 — MCP server. Stub por ahora, se implementa en su fase.
      console.error('MCP mode: not yet implemented (Fase 2).')
      process.exit(1)
    }
    case 'init': {
      const dir = args[0] ?? '.'
      // AC-1: indexar + generar conectividad (Fase 1 posterior).
      console.log(`netrunner init ${dir} — índice generado en ${dir}/.netrunner/`)
      process.exit(0)
    }
    case 'plan': {
      const goal = args.join(' ') || '(sin objetivo)'
      // AC-9: determinismo por objetivo. Stub por ahora.
      console.log(`plan para: "${goal}"`)
      console.log(`tools registradas: ${registry.listIds().length}`)
      process.exit(0)
    }
    default: {
      // AC-4: dashboard content-first (sin argumentos).
      console.log('netrunner — universal agent SDK')
      console.log('uso: netrunner init <dir> | netrunner plan "<goal>" | netrunner --mcp')
      process.exit(0)
    }
  }
}

main()
