import { describe, it, expect } from 'vitest'
import { emitEvent, replayEvents } from '../src/context/events'
import { ToolRegistry } from '../src/core/registry'

// role: tests for the durable event + waterfall (AC-1..4 of features/events.feature).
// The agent can replay what happened (dsh invariant) and policy/guard are seams.

describe('evento durable + waterfall', () => {
  it('emite y replay eventos en orden (AC-1/2)', () => {
    const log: string[] = []
    emitEvent(log, { type: 'op/start', tool: 'op.test' })
    emitEvent(log, { type: 'op/result', tool: 'op.test', ok: true })

    const events = replayEvents(log)
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('op/start')
    expect(events[1].type).toBe('op/result')
    expect(events[1].ok).toBe(true)
  })

  it('log vacío → [] (AC-4)', () => {
    expect(replayEvents([])).toEqual([])
  })

  it('hooks pre/post no rompen la ejecución (AC-3/4)', () => {
    const registry = new ToolRegistry()
    const calls: string[] = []
    registry.register({
      id: 'test.tool',
      description: 'test',
      family: 'test',
      readOnly: true,
      capabilities: [],
      inputSchema: {},
      execute: async () => ({ ok: true }),
    })
    registry.onPreExecute(() => { calls.push('pre') })
    registry.onPostExecute(() => { calls.push('post') })

    return registry.call('test.tool', {}, { projectDir: '/tmp', secrets: {}, profile: 'explore' }).then(() => {
      expect(calls).toEqual(['pre', 'post'])
    })
  })
})
