/**
 * rol: handlers de seguridad (W5.F5.2) — guard, policy, breach.
 * Cada handler recibe el contexto (DI) y delega en emit/fail del router.
 */
import type { HandlerContext } from './types'

/** rol: guard check (patrones secrets + symlinks + imports rotos). */
export async function guard(ctx: HandlerContext): Promise<void> {
  const { guardCheck } = await import('../../guard/index')
  const result = guardCheck(ctx.projectDir)
  ctx.emit(result, ctx.human)
  // fix auditor (A2): fail-closed — si hay secrets/problemas, exit ≠ 0 (el CI/agente se entera)
  process.exit(result.ok ? 0 : 1)
}

/** rol: evaluar política de intención (fail-closed, AC-4). */
export async function policy(ctx: HandlerContext): Promise<void> {
  const { evaluatePolicy } = await import('../../policy/index')
  const intent = ctx.args[0] ?? 'explore'
  const readOnly = ctx.flags['readonly'] === 'true' || ctx.flags['readonly'] === '1'
  const approval = ctx.flags['approval'] === 'true' || ctx.flags['approval'] === '1'
  ctx.emit({ intent, decision: evaluatePolicy(intent as never, { readOnly, approval }) }, ctx.human)
  process.exit(0)
}

/** rol: descifrar un repo desconocido (Breach Protocol, W3.D3.1). */
export async function breach(ctx: HandlerContext): Promise<void> {
  const { breach } = await import('../../breach/index')
  ctx.emit(await breach(ctx.projectDir), ctx.human)
  process.exit(0)
}
