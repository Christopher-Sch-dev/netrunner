/**
 * rol: Log de resultados del curator (validador #5 — patrón Karpathy log.md + autoresearch TSV).
 * Log append-only TSV parseable de la auto-mejora: cada decisión del curator queda
 * anclada a señal externa medible y comparable (timestamp | symbol | action | ok).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero un log append-only de resultados del curator,
 *   para que la auto-mejora quede anclada a señal externa medible.
 *
 * AC (features/results.feature):
 *   AC-1 appendResult agrega una línea TSV.
 *   AC-2 readResults devuelve las entradas parseadas.
 *   AC-3 log vacío → []; append idempotente.
 *   AC-4 formato TSV parseable (grep-friendly).
 */

/** Una entrada del log de resultados. */
export interface ResultEntry {
  symbol: string
  action: string
  ok: boolean
}

/** rol: agrega una entrada TSV al log (AC-1/4). */
export function appendResult(log: string[], entry: ResultEntry): void {
  const line = `${Date.now()}\t${entry.symbol}\t${entry.action}\t${entry.ok}`
  log.push(line)
}

/** rol: parsea el log a entradas (AC-2/3). */
export function readResults(log: string[]): Array<ResultEntry & { timestamp: number }> {
  return log.map((line) => {
    const [ts, symbol, action, ok] = line.split('\t')
    return { timestamp: Number(ts), symbol, action, ok: ok === 'true' }
  })
}
