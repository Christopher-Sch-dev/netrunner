/**
 * rol: ops — control determinista del proyecto (AC-6, P0-2 del validador de scope).
 * Ejecuta operaciones del stack (test/build/lint) con señal externa real (exit code),
 * respetando el packageManager detectado (pnpm/npm/bun/yarn). Es el "control autónomo"
 * que el agente opera el proyecto de forma determinista y segura.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero ejecutar operaciones deterministas (test/build/lint),
 *   para controlar el proyecto de forma autónoma y segura (AC-6).
 *
 * AC (features/ops.feature):
 *   AC-1 runOp(kind, dir) ejecuta la operación del stack.
 *   AC-2 devuelve { ok, exitCode, output } con señal externa real.
 *   AC-3 es ToolSpec del contrato (op.test/build/lint, family op).
 *   AC-4 operación desconocida → error (no inventa).
 *   AC-5 respeta el packageManager detectado.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ToolSpec, ToolContext } from '../core/registry'

/** Operaciones soportadas (determinista, no inventa). */
const OPS = ['test', 'build', 'lint'] as const
type OpKind = (typeof OPS)[number]

/** rol: detecta el packageManager del proyecto (pnpm/npm/bun/yarn) por lockfile. */
function detectPkg(dir: string): string {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun'
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

/** rol: ejecuta la operación y devuelve { ok, exitCode, output } (señal externa real). */
export function runOp(kind: string, projectDir: string, timeoutMs = 30000): Promise<{ ok: boolean; exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    if (!(OPS as readonly string[]).includes(kind)) {
      reject(new Error(`operación no soportada: '${kind}' (usa: ${OPS.join(', ')})`))
      return
    }
    const pkg = detectPkg(projectDir)
    const cmd = pkg
    const args = ['run', kind]
    // detached: true → el proceso corre en su propio grupo; kill(-pid) mata el grupo completo
    const child = spawn(cmd, args, { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
    let output = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try { process.kill(-child.pid!, 'SIGKILL') } catch { child.kill('SIGKILL') } // mata el grupo (pnpm + sleep)
    }, timeoutMs)
    child.stdout.on('data', (c) => { output += c })
    child.stderr.on('data', (c) => { output += c })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) {
        resolve({ ok: false, exitCode: -1, output: `${output}\n[timeout] operación excedió ${timeoutMs}ms` })
      } else {
        resolve({ ok: code === 0, exitCode: code ?? -1, output })
      }
    })
  })
}

/** rol: spec de la tool op.<kind> (family op, readOnly=false — muta/ejecuta). */
export function opTool(kind: OpKind): ToolSpec {
  return {
    id: `op.${kind}`,
    description: `Ejecuta '${kind}' del proyecto (determinista, exit code real).`,
    family: 'op',
    readOnly: false,
    capabilities: ['ops'],
    inputSchema: {},
    execute: async (_input: Record<string, unknown>, ctx: ToolContext) => {
      const r = await runOp(kind, ctx.projectDir)
      return { ok: r.ok, exitCode: r.exitCode, output: r.output.slice(0, 2000) }
    },
  }
}
