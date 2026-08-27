/**
 * rol: Plugin system de Netrunner (P0-1 del validador de scope).
 * Permite que las funcionalidades se registren como PLUGINS con extension-points
 * y efectos REVERSIBLES (patrón Cordis/AutoGen/LATM): cargar un plugin registra
 * sus tools; descargarlo las deshace. El núcleo (src/core/registry.ts) NO importa
 * plugins — sin acoplamiento inverso (AC-6).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que las funcionalidades sean plugins conectables,
 *   para que "todas las herramientas estén conectadas en sus nodos" y se puedan
 *   cargar/descargar por proyecto sin romper el núcleo.
 *
 * AC (features/plugin-system.feature):
 *   AC-1 Plugin = { id, manifest, apply(ctx), inject }.
 *   AC-2 PluginContext expone registerTool/onContext/policyHook.
 *   AC-3 loadPlugin aplica y devuelve handle.
 *   AC-4 unloadPlugin deshace (reversible).
 *   AC-5 idempotente (no duplica).
 *   AC-6 el núcleo no importa plugins.
 */
import type { ToolRegistry, ToolSpec } from './registry'

/** Manifest del plugin: qué stack/capabilities lo activan (diversificación por proyecto). */
export interface PluginManifest {
  stack: string[]
  capabilities: string[]
}

/** Extension-points que el plugin usa para conectarse al núcleo. */
export interface PluginContext {
  projectDir: string
  registerTool(spec: ToolSpec): void
  onContext(fn: (ctx: unknown) => void): void
  policyHook(fn: (intent: string, ctx: unknown) => 'allow' | 'deny'): void
}

/** Un plugin: funcionalidad conectable con efectos reversibles. */
export interface Plugin {
  id: string
  manifest: PluginManifest
  apply(ctx: PluginContext): void
  inject?(ctx: PluginContext): void
}

/** Handle devuelto por loadPlugin; unloadPlugin lo usa para deshacer. */
export interface PluginHandle {
  pluginId: string
  registeredToolIds: string[]
}

/** rol: carga un plugin, registra sus tools y devuelve el handle (reversible). */
export function loadPlugin(plugin: Plugin, registry: ToolRegistry, base: { projectDir: string }): PluginHandle {
  const registeredToolIds: string[] = []
  const ctx: PluginContext = {
    projectDir: base.projectDir,
    registerTool(spec: ToolSpec) {
      // idempotente: si ya existe, no duplica (AC-5)
      if (!registry.listIds().includes(spec.id)) {
        registry.register(spec)
        registeredToolIds.push(spec.id)
      }
    },
    onContext() { /* hook de contexto (futuro) */ },
    policyHook() { /* hook de policy (futuro) */ },
  }
  plugin.apply(ctx)
  plugin.inject?.(ctx)
  return { pluginId: plugin.id, registeredToolIds }
}

/** rol: descarga un plugin, deshaciendo sus tools (reversible, AC-4). */
export function unloadPlugin(handle: PluginHandle, registry: ToolRegistry): void {
  for (const id of handle.registeredToolIds) {
    registry.unregister(id)
  }
}
