import { describe, it, expect } from 'vitest'
import { toolsetsForStack } from '../src/transport/toolsets'

// rol: tests de la matriz stack→toolsets declarativa (AC-1..4 de features/toolsets.feature).

describe('matriz stack→toolsets declarativa', () => {
  it('stack TS activa graph+stack+ops (AC-2/3)', () => {
    const toolsets = toolsetsForStack({ language: 'typescript', framework: 'node' })
    expect(toolsets).toContain('graph')
    expect(toolsets).toContain('stack')
    expect(toolsets).toContain('ops')
  })

  it('stack python activa graph+stack (AC-3)', () => {
    const toolsets = toolsetsForStack({ language: 'python', framework: 'django' })
    expect(toolsets).toContain('graph')
    expect(toolsets).toContain('stack')
  })

  it('determinista: misma entrada → misma salida (AC-2)', () => {
    const a = toolsetsForStack({ language: 'go', framework: '' })
    const b = toolsetsForStack({ language: 'go', framework: '' })
    expect(a).toEqual(b)
  })
})
