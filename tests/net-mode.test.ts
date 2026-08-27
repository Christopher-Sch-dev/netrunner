import { describe, it, expect } from 'vitest'
import { netMode } from '../src/net-mode/index'

// role: tests for net mode (AC-1..3 of features/net-mode.feature).
// El deck se adapta al objetivo (Wintermute/Neuromancer).

describe('net mode (el modo del deck)', () => {
  it('perfil explore → tools graph/read (AC-1)', () => {
    const tools = netMode('explore')
    expect(tools).toContain('graph.explore')
    expect(tools).toContain('stack.info')
  })

  it('perfil operate → tools ops (AC-1)', () => {
    const tools = netMode('operate')
    expect(tools).toContain('ops.test')
    expect(tools).toContain('ops.build')
  })

  it('perfil audit → tools guard/policy (AC-1)', () => {
    const tools = netMode('audit')
    expect(tools).toContain('guard')
    expect(tools).toContain('policy')
  })

  it('perfil desconocido → explore (AC-2)', () => {
    expect(netMode('xyz')).toEqual(netMode('explore'))
  })
})
