/**
 * rol: Netrunner durable event (Juez 2 — "model-visible ⟺ logged" invariant).
 * Each operation emits a reconstructible event (op/start, op/result, op/error)
 * PERSISTED to .netrunner/events.log (append-only). The agent can replay what
 * happened, not just see the last result.
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want each operation to emit a durable event persisted to disk,
 *   so that the agent can replay what happened (invariant dsh).
 *
 * AC (features/events-persist.feature):
 *   AC-1 emitEvent(projectDir, event) persists to .netrunner/events.log.
 *   AC-2 replayEvents(projectDir) returns events in order.
 *   AC-4 empty log → [].
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** A durable operation event. */
export interface DurableEvent {
  type: 'op/start' | 'op/result' | 'op/error'
  tool: string
  ok?: boolean
  ts: number
}

const EVENTS_FILE = '.netrunner/events.log'

/** rol: persists a durable event to the log (AC-1). */
export function emitEvent(projectDir: string, event: Omit<DurableEvent, 'ts'>): void {
  try {
    const path = join(projectDir, EVENTS_FILE)
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, JSON.stringify({ ...event, ts: Date.now() }) + '\n')
  } catch { /* events no crítico — no rompe la operación */ }
}

/** rol: replays the events in order (AC-2/4). */
export function replayEvents(projectDir: string): DurableEvent[] {
  const path = join(projectDir, EVENTS_FILE)
  if (!existsSync(path)) return []
  try {
    return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as DurableEvent)
  } catch {
    return []
  }
}
