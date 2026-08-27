/**
 * rol: Evento durable de Netrunner (Juez 2 — invariante "model-visible ⟺ logged" de dsh).
 * Cada operación emite un evento reconstruible (op/start, op/result, op/error).
 * El agente puede replay qué pasó, no solo ver el último resultado.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que cada operación emita un evento durable,
 *   para que el agente pueda replay qué pasó.
 *
 * AC (features/events.feature):
 *   AC-1 emitEvent agrega un evento durable.
 *   AC-2 replayEvents devuelve los eventos en orden.
 *   AC-4 log vacío → [].
 */

/** Un evento durable de operación. */
export interface DurableEvent {
  type: 'op/start' | 'op/result' | 'op/error'
  tool: string
  ok?: boolean
  ts: number
}

/** rol: agrega un evento durable al log (AC-1). */
export function emitEvent(log: string[], event: Omit<DurableEvent, 'ts'>): void {
  log.push(JSON.stringify({ ...event, ts: Date.now() }))
}

/** rol: replay los eventos en orden (AC-2/4). */
export function replayEvents(log: string[]): DurableEvent[] {
  return log.map((line) => JSON.parse(line) as DurableEvent)
}
