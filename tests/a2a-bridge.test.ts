import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry } from '../src/core/registry'
import { registerA2ABridge, type A2ABridgeOptions } from '../src/transport/a2a-bridge'

// rol: A2A-MCP bridge (W4.E4.2, patrón Nexarion) — expone un agente A2A remoto
// como tool MCP local en el ToolRegistry. El cliente A2A (sendTask) es inyectado
// (DI, Mandamiento 2) para testear sin red.

function makeRegistry(): ToolRegistry {
  return new ToolRegistry()
}

function makeOptions(overrides: Partial<A2ABridgeOptions> = {}): A2ABridgeOptions {
  return {
    agentId: 'reviewer',
    endpoint: 'https://a2a.local/.well-known/agent.json',
    sendTask: vi.fn(async () => ({ state: 'completed', text: 'ok' })),
    ...overrides,
  }
}

describe('a2a-bridge (exponer agente A2A remoto como tool MCP local)', () => {
  it('AC-1/2: registrar el bridge expone una tool a2a.<agentId> mutating en el registry', () => {
    const registry = makeRegistry()
    registerA2ABridge(registry, makeOptions())

    const tool = registry.get('a2a.reviewer')
    expect(tool).toBeDefined()
    expect(tool?.id).toBe('a2a.reviewer')
    expect(tool?.readOnly).toBe(false) // delega a un agente externo → muta estado remoto
    expect(tool?.capabilities).toContain('explore')
  })

  it('AC-3: invocar la tool delega al agente remoto vía tasks/send y devuelve el texto del artifact', async () => {
    const registry = makeRegistry()
    registry.onPolicyCheck(() => true) // policy-gate (M7): la tool es mutating → requiere approval
    const sendTask = vi.fn(async () => ({ state: 'completed', text: 'contrato OK' }))
    registerA2ABridge(registry, makeOptions({ sendTask }))

    const result = await registry.call('a2a.reviewer', { text: 'revisa este contrato' }, {
      projectDir: '/tmp/x', secrets: {}, profile: 'explore',
    })

    expect(sendTask).toHaveBeenCalledTimes(1)
    expect(sendTask).toHaveBeenCalledWith('https://a2a.local/.well-known/agent.json', 'revisa este contrato')
    expect(result).toEqual({ ok: true, data: { state: 'completed', text: 'contrato OK' } })
  })

  it('AC-4: task no completado lanza un error descriptivo', async () => {
    const registry = makeRegistry()
    registry.onPolicyCheck(() => true) // policy-gate (M7)
    const sendTask = vi.fn(async () => ({ state: 'failed', text: '' }))
    registerA2ABridge(registry, makeOptions({ sendTask }))

    await expect(
      registry.call('a2a.reviewer', { text: 'x' }, { projectDir: '/tmp/x', secrets: {}, profile: 'explore' }),
    ).rejects.toThrow(/failed/)
  })

  it('AC-5: el cliente A2A es inyectado (DI) — el bridge no hardcodea el transporte', () => {
    const registry = makeRegistry()
    const sendTask = vi.fn()
    registerA2ABridge(registry, makeOptions({ sendTask }))
    // si el bridge hardcodeara el transporte, sendTask inyectado no se usaría
    expect(sendTask).not.toHaveBeenCalled() // solo se llama al ejecutar la tool
  })

  it('AC-6: registrar el mismo agente dos veces lanza "Tool already registered"', () => {
    const registry = makeRegistry()
    registerA2ABridge(registry, makeOptions())
    expect(() => registerA2ABridge(registry, makeOptions())).toThrow(/already registered/)
  })
})
