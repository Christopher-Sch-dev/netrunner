import { describe, it, expect } from 'vitest'
import { resolveAlias, deckState } from '../src/naming/index'

// role: tests for naming cyberpunk (AC-1..4 of features/naming.feature).
// El CLI habla el lenguaje del cyberdeck (jack/quickhacks/ice) + deck muestra el estado.

describe('naming cyberpunk (aliases + deck)', () => {
  it('jack → init (AC-1)', () => {
    expect(resolveAlias('jack')).toBe('init')
  })

  it('quickhacks es comando propio (no alias, AC-1)', () => {
    expect(resolveAlias('quickhacks')).toBe('quickhacks')
  })

  it('ice → guard (AC-1)', () => {
    expect(resolveAlias('ice')).toBe('guard')
  })

  it('comando normal → sin cambio (AC-3)', () => {
    expect(resolveAlias('status')).toBe('status')
  })

  it('deck muestra quickhacks + daemons + canon (AC-2)', () => {
    const state = deckState({ quickhacks: ['test', 'build'], daemons: ['curator'], canonStale: true })
    expect(state.quickhacks).toContain('test')
    expect(state.daemons).toContain('curator')
    expect(state.canonStale).toBe(true)
  })
})
