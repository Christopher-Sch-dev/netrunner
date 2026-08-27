import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emitEvent, replayEvents } from '../src/context/events'

// role: tests for durable events persisted (AC-1..4 of features/events-persist.feature).
// invariant dsh "model-visible ⟺ logged": el agente puede replay qué pasó.

describe('eventos durables persistidos', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-events-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('emitEvent persiste y replayEvents los devuelve en orden (AC-1/2)', () => {
    emitEvent(dir, { type: 'op/start', tool: 'op.test' })
    emitEvent(dir, { type: 'op/result', tool: 'op.test', ok: true })

    const events = replayEvents(dir)
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('op/start')
    expect(events[1].type).toBe('op/result')
    expect(events[1].ok).toBe(true)
  })

  it('sin log → [] (AC-4)', () => {
    expect(replayEvents(dir)).toEqual([])
  })
})
