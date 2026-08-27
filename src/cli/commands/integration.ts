/**
 * rol: handlers de integración (W5.F5.2) — mesh, plugin, install, uninstall.
 * Cada handler recibe el contexto (DI) y delega en emit/fail del router.
 */
import type { HandlerContext } from './types'

/** rol: mesh de proyectos (multi-repo). */
export async function mesh(ctx: HandlerContext): Promise<void> {
  const { meshProjects } = await import('../../mesh/index')
  const dirs = ctx.args.length > 0 ? ctx.args : [ctx.projectDir]
  ctx.emit(await meshProjects(dirs), ctx.human)
  process.exit(0)
}

/** rol: generar un plugin (plugin/generate). */
export async function plugin(ctx: HandlerContext): Promise<void> {
  const { generatePlugin } = await import('../../plugin/generate')
  const name = ctx.args[0] ?? 'netrunner'
  const version = ctx.args[1] ?? '1.0.0'
  const result = generatePlugin(name, version, ctx.projectDir)
  ctx.emit(result, ctx.human)
  process.exit(0)
}

/** rol: instalar el conectable layer (mcp | opencode | claude | cursor). */
export async function install(ctx: HandlerContext): Promise<void> {
  const { install } = await import('../../install')
  const target = ctx.args[0] ?? 'mcp'
  try {
    const result = install(target, ctx.projectDir)
    ctx.emit(result, ctx.human)
  } catch (e) {
    ctx.fail('UNKNOWN_TARGET', String((e as Error).message), 'usa: mcp | opencode | claude | cursor', 2)
  }
  process.exit(0)
}

/** rol: desinstalar el conectable layer (reversible, AC-8). */
export async function uninstall(ctx: HandlerContext): Promise<void> {
  const { uninstall } = await import('../../install')
  const target = ctx.args[0] ?? 'mcp'
  try {
    const result = uninstall(target, ctx.projectDir)
    ctx.emit(result, ctx.human)
  } catch (e) {
    ctx.fail('UNKNOWN_TARGET', String((e as Error).message), 'usa: mcp | opencode | claude | cursor', 2)
  }
  process.exit(0)
}
