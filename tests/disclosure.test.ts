import { describe, it, expect } from 'vitest'
import { disclosureFor } from '../src/disclosure/index'

// role: tests for progressive disclosure por framework (AC-1..4 of features/disclosure.feature).
// El agente no paga tokens por tools que no aplican (Netdeck: RAM finita).

describe('progressive disclosure por framework', () => {
  it('framework react → incluye ops.build (AC-1)', () => {
    const tools = disclosureFor({ language: 'typescript', framework: 'react' })
    expect(tools).toContain('ops.build')
  })

  it('framework node → incluye ops.test (AC-1)', () => {
    const tools = disclosureFor({ language: 'javascript', framework: 'node' })
    expect(tools).toContain('ops.test')
  })

  it('framework desconocido → tools base (AC-2)', () => {
    const tools = disclosureFor({ language: 'unknown', framework: 'unknown' })
    expect(tools).toContain('graph.explore')
    expect(tools).toContain('stack.info')
  })

  it('determinista (AC-4)', () => {
    const a = disclosureFor({ language: 'typescript', framework: 'react' })
    const b = disclosureFor({ language: 'typescript', framework: 'react' })
    expect(a).toEqual(b)
  })
})
