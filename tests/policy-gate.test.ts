import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../src/core/registry'

// role: tests for policy-gate (AC-1..4 of features/policy-gate.feature).
// El ICE bloquea (no solo reporta) las ops mutating sin approval (M7).

function makeRegistry(withReadOnly: boolean): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register({
    id: 'op.mutate',
    description: 'mutates',
    family: 'op',
    readOnly: false,
    capabilities: ['ops'],
    inputSchema: {},
    execute: async () => ({ done: true }),
  })
  registry.register({
    id: 'op.read',
    description: 'reads',
    family: 'op',
    readOnly: true,
    capabilities: ['ops'],
    inputSchema: {},
    execute: async () => ({ read: true }),
  })
  return registry
}

describe('policy-gate (ICE bloquea ops mutating)', () => {
  const ctx = { projectDir: '/tmp', secrets: {}, profile: 'ops' }

  it('tool mutating sin approval → bloqueada (AC-1/2)', async () => {
    const registry = makeRegistry(true)
    registry.onPolicyCheck((_id, _input, tool) => tool.readOnly) // allow solo si readOnly
    await expect(registry.call('op.mutate', {}, ctx)).rejects.toThrow(/policy denied/i)
  })

  it('tool readOnly → siempre se ejecuta (AC-3)', async () => {
    const registry = makeRegistry(true)
    registry.onPolicyCheck((_id, _input, tool) => tool.readOnly)
    const result = await registry.call('op.read', {}, ctx)
    expect(result).toEqual({ read: true })
  })

  it('sin policyHook → mutating bloqueada (fail-closed, AC-4)', async () => {
    const registry = makeRegistry(false)
    await expect(registry.call('op.mutate', {}, ctx)).rejects.toThrow(/deny|policy|blocked/i)
  })
})
