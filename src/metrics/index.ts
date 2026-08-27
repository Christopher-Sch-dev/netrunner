/**
 * rol: m4-metrics — p50/p95/p99 sobre los seams (features/metrics.feature).
 * LA VISION (M4, eslabón más débil): los seams (hooks/events/history) están listos
 * pero cero métricas. Este módulo registra la latencia de cada op y calcula
 * percentiles (p50/p95/p99) para que el agente vea el rendimiento real.
 *
 * SPEC (Mandamiento 0 + 4):
 *   Como el motor Netrunner,
 *   quiero métricas de latencia (p50/p95/p99) sobre los seams,
 *   para que el agente vea el rendimiento real de las operaciones.
 *
 * AC (features/metrics.feature):
 *   AC-1 recordLatency(dir, tool, ms) persiste la latencia.
 *   AC-2 latencyPercentiles(dir, tool) → { p50, p95, p99, count }.
 *   AC-4 sin datos → null.
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const METRICS_FILE = '.netrunner/metrics.log'

/** rol: registra la latencia de una op (AC-1). */
export function recordLatency(projectDir: string, tool: string, ms: number): void {
  try {
    const path = join(projectDir, METRICS_FILE)
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, `${tool}\t${ms}\n`)
  } catch { /* metrics no crítico */ }
}

/** Percentiles calculados. */
export interface LatencyPercentiles { p50: number; p95: number; p99: number; count: number }

/** rol: calcula p50/p95/p99 de una tool (AC-2/4). */
export function latencyPercentiles(projectDir: string, tool: string): LatencyPercentiles | null {
  const path = join(projectDir, METRICS_FILE)
  if (!existsSync(path)) return null
  try {
    const values = readFileSync(path, 'utf8')
      .trim().split('\n').filter(Boolean)
      .map((line) => line.split('\t'))
      .filter(([t]) => t === tool)
      .map(([, ms]) => Number(ms))
      .sort((a, b) => a - b)
    if (values.length === 0) return null
    const at = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))]
    return { p50: at(0.5), p95: at(0.95), p99: at(0.99), count: values.length }
  } catch {
    return null
  }
}
