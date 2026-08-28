/**
 * rol: setup — instalador agéntico un-comando (features/setup.feature, fundamento gentle-ai).
 * Vision de Cris: NetRunner es público — cualquiera lo instala con UN comando y tiene las
 * mismas posibilidades. El AGENTE instala todo solo (no el humano). Orden de prioridad de
 * sistemas agénticos: opencode → hermes → claude → codex (solo los detectados en la máquina).
 *
 * Flujo (Prepare → Apply → Verify → Report, patrón gentle-ai):
 *  1. detectPlatform(): OS/arch.
 *  2. detectAgents(): qué sistemas agénticos están presentes (por dir de config o binario).
 *  3. Apply: install() por target en orden de prioridad (solo los detectados) + init el cwd.
 *  4. Verify: doctor + status → ok:true solo si responde.
 *  5. Report: JSON + state en ~/.netrunner/state.json (idempotente).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { install } from '../install'

/** Orden de prioridad de sistemas agénticos (decisión de Cris 27 ago). */
export const AGENT_PRIORITY = ['opencode', 'hermes', 'claude', 'codex'] as const
type AgentTarget = (typeof AGENT_PRIORITY)[number]

/** Señal de presencia de un agente (dir de config o binario en PATH). */
const AGENT_SIGNALS: Record<AgentTarget, string[]> = {
  opencode: ['opencode.json', '.opencode'],
  hermes: ['.hermes'],
  claude: ['.claude'],
  codex: ['.codex'],
}

export interface SetupResult {
  ok: boolean
  platform: { os: string; arch: string }
  detected: string[]
  configured: string[]
  written: string[]
  error?: string
}

/** rol: detecta SO/arch (mandato ai-native-cli). */
export function detectPlatform(): { os: string; arch: string } {
  return { os: process.platform, arch: process.arch }
}

/** rol: detecta qué agentes están presentes (por dir de config en el HOME del usuario). */
export function detectAgents(): string[] {
  const home = process.env.HOME ?? ''
  return AGENT_PRIORITY.filter((a) =>
    AGENT_SIGNALS[a].some((sig) => existsSync(join(home, sig))),
  )
}

/** rol: aplica la instalación (install por target en orden de prioridad + init). */
export async function applySetup(dir: string): Promise<{ configured: string[]; written: string[] }> {
  const detected = detectAgents()
  const configured: string[] = []
  const written: string[] = []
  // instala en orden de prioridad, solo los detectados
  for (const target of AGENT_PRIORITY) {
    if (detected.includes(target)) {
      try {
        const r = install(target, dir)
        configured.push(target)
        written.push(...r.written)
      } catch { /* target no soportado — se omite */ }
    }
  }
  // conectable layer (grafo + AGENTS.md + program.md) en el cwd
  try {
    const { initProject } = await import('../init')
    const init = await initProject(dir)
    written.push(...init.written)
  } catch { /* init puede fallar sin binario — no rompe setup */ }
  return { configured, written }
}

/** rol: verifica que el binario responde (doctor) — ok:true solo si funciona. */
export async function verifySetup(dir: string): Promise<boolean> {
  try {
    const { doctor } = await import('../doctor/index')
    const d = await doctor(dir)
    return d.healthy === true
  } catch {
    return false
  }
}

/** rol: registra el estado en ~/.netrunner/state.json (idempotente, análogo gentle-ai). */
export function persistState(result: SetupResult): string {
  const dir = join(process.env.HOME ?? '', '.netrunner')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'state.json')
  writeFileSync(path, JSON.stringify({ ...result, ts: Date.now() }, null, 2))
  return path
}

/** rol: punto de entrada — ejecuta el pipeline Prepare→Apply→Verify→Report. */
export async function setup(dir: string): Promise<SetupResult & { stateFile: string }> {
  const platform = detectPlatform()
  const detected = detectAgents()
  const { configured, written } = await applySetup(dir)
  const ok = await verifySetup(dir)
  const result: SetupResult = {
    ok,
    platform,
    detected,
    configured,
    written,
    ...(ok ? {} : { error: 'doctor no reportó healthy:true' }),
  }
  const stateFile = persistState(result)
  return { ...result, stateFile }
}
