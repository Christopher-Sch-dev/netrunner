import { describe, it, expect } from 'vitest'
import { estimateTokens } from '../src/tokens/index'

// role: tests for token-counting (AC-1..3 of features/tokens.feature).
// El agente sabe cuánto contexto va a pagar (Netdeck: RAM finita).

describe('token-counting', () => {
  it('texto normal → ~25 tokens (AC-1)', () => {
    const text = 'a'.repeat(100)
    expect(estimateTokens(text)).toBe(25)
  })

  it('texto vacío → 0 (AC-2)', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('determinista (AC-3)', () => {
    expect(estimateTokens('hola mundo')).toBe(estimateTokens('hola mundo'))
  })
})
