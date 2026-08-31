/**
 * rol: handler de setup — instalador agéntico un-comando (features/setup.feature).
 * Instala NetRunner como tool agéntica en orden de prioridad (opencode→hermes→claude→codex),
 * genera el conectable layer, verifica con doctor y reporta JSON. Todo lo decide el agente.
 */
import type { HandlerContext } from './types'

/** rol: netrunner setup — instala y configura el motor agénticamente (un comando). */
export async function setup(ctx: HandlerContext): Promise<void> {
  const { setup } = await import('../../setup/index')
  try {
    const result = await setup(ctx.projectDir)
    ctx.emit(result, ctx.human)
    process.exit(result.ok ? 0 : 1)
  } catch (e) {
    ctx.fail('SETUP_FAILED', `setup failed: ${(e as Error).message}`, 'check the logs', 1)
  }
}
