/**
 * rol: Curator results log (validator #5 — append-only log pattern).
 * Append-only parseable TSV log of self-improvement: each curator decision stays
 * anchored to measurable, comparable external signal (timestamp | symbol | action | ok).
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want an append-only log of curator results,
 *   so that self-improvement stays anchored to measurable external signal.
 *
 * AC (features/results.feature):
 *   AC-1 appendResult adds a TSV line.
 *   AC-2 readResults returns the parsed entries.
 *   AC-3 empty log → []; append idempotent.
 *   AC-4 parseable TSV format (grep-friendly).
 */

/** An entry of the results log. */
export interface ResultEntry {
  symbol: string
  action: string
  ok: boolean
}

/** rol: adds a TSV entry to the log (AC-1/4). */
export function appendResult(log: string[], entry: ResultEntry): void {
  const line = `${Date.now()}\t${entry.symbol}\t${entry.action}\t${entry.ok}`
  log.push(line)
}

/** rol: parses the log into entries (AC-2/3). */
export function readResults(log: string[]): Array<ResultEntry & { timestamp: number }> {
  return log.map((line) => {
    const [ts, symbol, action, ok] = line.split('\t')
    return { timestamp: Number(ts), symbol, action, ok: ok === 'true' }
  })
}
