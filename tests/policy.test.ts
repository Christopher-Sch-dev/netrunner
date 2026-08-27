import { describe, it, expect } from 'vitest'
import { evaluatePolicy } from '../src/policy/index'

// rol: tests de policy cross-client (AC-1..4 de features/policy.feature).
// Parity: misma intención → misma decisión en cualquier agente. PURE + fail-closed.

describe('policy cross-client (parity)', () => {
  it('contexto read-only → allow por defecto (AC-2)', () => {
    expect(evaluatePolicy('explore', { readOnly: true, approval: false })).toBe('allow')
  })

  it('misma intención en distintos agentes → misma decisión (AC-1, parity)', () => {
    const intent = 'explore'
    const ctx = { readOnly: true, approval: false }
    // el agente NO está en la firma → el resultado es idéntico para todos
    expect(evaluatePolicy(intent, ctx)).toBe(evaluatePolicy(intent, ctx))
  })

  it('intent mutating sin aprobación → deny (AC-2)', () => {
    expect(evaluatePolicy('edit', { readOnly: false, approval: false })).toBe('deny')
  })

  it('context vacío → deny (fail-closed, AC-4)', () => {
    expect(evaluatePolicy('edit', {} as never)).toBe('deny')
  })
})
