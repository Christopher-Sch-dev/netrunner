/**
 * role: Tests TDD Wave P4.1 — netrunner inspect <url> (features/web-inspect.feature).
 * Contrato: motor local (fetch nativo) por defecto con rendered:false; BrowserAdapter
 * (CDP) inyectado por DI para consola/red/perf/a11y reales (AC-I1..I9).
 */
import { describe, expect, it, vi } from 'vitest'
import { inspectWeb, type BrowserAdapter, type InspectData } from '../src/web/inspect'

/** rol: adapter CDP de prueba que devuelve datos de consola/red/perf/a11y. */
function cdpAdapter(data: Partial<InspectData> = {}): BrowserAdapter {
  return {
    inspect: async () => ({
      console: [
        { type: 'log', text: 'hola desde la consola' },
        { type: 'error', text: 'ReferenceError: x is not defined' },
      ],
      network: [
        { url: 'https://example.com/', method: 'GET', status: 200 },
        { url: 'https://example.com/api', method: 'POST', status: 201 },
      ],
      perf: { domContentLoaded: 120, load: 300, fcp: 90, lcp: 250 },
      a11y: [
        { role: 'heading', name: 'Título' },
        { role: 'button', name: 'Enviar' },
      ],
      ...data,
    }),
  }
}

describe('web inspect — netrunner inspect <url> (P4.1)', () => {
  it('sin browser, motor local reporta rendered:false y recomienda --render (AC-I1/I2)', async () => {
    const httpFetch = vi.fn(async () => new Response('<html><body><h1>Hola</h1></body></html>', { status: 200 }))
    const res = await inspectWeb('https://example.com/', { httpFetch })
    expect(res.rendered).toBe(false)
    expect(res.source).toBe('local')
    expect(res.hint).toMatch(/--render/)
    expect(httpFetch).toHaveBeenCalled()
  })

  it('con BrowserAdapter DI (CDP), reporta rendered:true y source cdp (AC-I3)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    expect(res.rendered).toBe(true)
    expect(res.source).toBe('cdp')
  })

  it('consola extrae logs y errores JS (AC-I4)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    expect(res.console).toContainEqual({ type: 'log', text: 'hola desde la consola' })
    expect(res.console).toContainEqual({ type: 'error', text: 'ReferenceError: x is not defined' })
  })

  it('red extrae requests con url/method/status (AC-I5)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    expect(res.network).toContainEqual({ url: 'https://example.com/api', method: 'POST', status: 201 })
    expect(res.network[0].url).toBe('https://example.com/')
  })

  it('perf extrae timings domContentLoaded/load/fcp/lcp (AC-I6)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    expect(typeof res.perf.domContentLoaded).toBe('number')
    expect(typeof res.perf.lcp).toBe('number')
    expect(res.perf.fcp).toBe(90)
  })

  it('a11y extrae el accessibility tree (role + name) (AC-I7)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    expect(res.a11y.length).toBeGreaterThan(0)
    expect(res.a11y[0]).toHaveProperty('role')
    expect(res.a11y[0]).toHaveProperty('name')
  })

  it('el output se trata como datos no instrucciones (AC-I9)', async () => {
    const res = await inspectWeb('https://example.com/', { adapter: cdpAdapter() })
    // solo datos estructurados, sin campos de instrucción
    expect(res).not.toHaveProperty('instructions')
    expect(res).not.toHaveProperty('prompt')
  })
})
