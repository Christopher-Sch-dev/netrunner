# Gherkin — Plugin system real (src/core/plugin.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que las funcionalidades se registren como PLUGINS con extension-points
y efectos reversibles (patrón Cordis/AutoGen/LATM),
**para** que "todas las herramientas estén conectadas en sus nodos" y se puedan
cargar/descargar por proyecto sin romper el núcleo (diversificación por proyecto).

## Acceptance Criteria (del validador de scope, P0-1)
- **AC-1**: `Plugin` = { id, manifest (stack triggers + capabilities), apply(ctx), inject }.
- **AC-2**: `PluginContext` expone extension-points: `registerTool(spec)`, `onContext(fn)`, `policyHook(fn)`.
- **AC-3**: `loadPlugin(plugin, registry, ctx)` aplica el plugin (registra tools) y devuelve un `handle` para descargarlo.
- **AC-4**: `unloadPlugin(handle)` DESHACE los efectos (reversible): quita las tools que el plugin registró.
- **AC-5**: idempotente: cargar el mismo plugin dos veces no duplica (lanza o no-op).
- **AC-6**: el núcleo (`src/core/registry.ts`) NO importa plugins (sin acoplamiento inverso).

## Escenarios
```
Feature: Plugin system

  Scenario: cargar un plugin registra sus tools
    Given un plugin con registerTool('op.test')
    When  loadPlugin(plugin, registry, ctx)
    Then  registry.listIds() contiene 'op.test'

  Scenario: descargar un plugin deshace sus tools
    When  unloadPlugin(handle)
    Then  registry.listIds() NO contiene 'op.test'

  Scenario: cargar dos veces no duplica
    When  loadPlugin dos veces
    Then  lanza error o no-op (idempotente)
```
