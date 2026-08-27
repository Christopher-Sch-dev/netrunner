/**
 * rol: Netrunner durable event (Juez 2 — "model-visible ⟺ logged" invariant).
 * Each operation emits a reconstructible event (op/start, op/result, op/error).
 * The agent can replay what happened, not just see the last result.
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want each operation to emit a durable event,
 *   so that the agent can replay what happened.
 *
 * AC (features/events.feature):
 *   AC-1 emitEvent adds a durable event.
 *   AC-2 replayEvents returns the events in order.
 *   AC-4 empty log → [].
 */

/** A durable operation event. */
export interface DurableEvent {
  type: 'op/start' | 'op/result' | 'op/error'
  tool: string
  ok?: boolean
  ts: number
}

/** rol: adds a durable event to the log (AC-1). */
export function emitEvent(log: string[], event: Omit<DurableEvent, 'ts'>): void {
  log.push(JSON.stringify({ ...event, ts: Date.now() }))
}

/** rol: replays the events in order (AC-2/4). */
export function replayEvents(log: string[]): DurableEvent[] {
  return log.map((line) => JSON.parse(line) as DurableEvent)
}
