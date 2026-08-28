import { describe, it, expect } from 'vitest'
import { dnaScan, normalizeHex, gcd, isNeutral } from '../src/dna/index'

// role: tests for netrunner dna (Wave J2, features/dna.feature).
// Verifica extracción determinista del ADN de diseño (AC-1..7) con HTML+CSS de prueba.

// HTML+CSS de prueba: color primario, CTA accent, escala neutra, fonts, spacing, radius, shadow, canvas.
const HTML = `<!doctype html>
<html>
<head>
<style>
  :root {
    --color-primary: #0ea5e9;
    --color-accent: #f59e0b;
    --color-success: #22c55e;
    --color-error: #ef4444;
    --color-bg: #ffffff;
    --color-text: #1f2937;
  }
  body { font-family: "Inter", system-ui, sans-serif; background: #ffffff; color: #1f2937; padding: 16px; }
  h1 { font-family: "Inter", sans-serif; font-size: 40px; font-weight: 700; line-height: 1.1; }
  h2 { font-size: 32px; font-weight: 600; line-height: 1.2; }
  p { font-size: 16px; font-weight: 400; line-height: 1.6; margin-bottom: 24px; }
  .card { background: #0ea5e9; border-radius: 12px; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 8px; }
  .btn { background: #f59e0b; }
  .muted { color: #6b7280; }
  @media (min-width: 768px) { .grid { gap: 16px; } }
</style>
</head>
<body>
  <canvas width="300" height="150"></canvas>
  <button class="btn" style="background:#f59e0b; border-radius:16px;">CTA</button>
  <div class="card" style="color:#ffffff; padding:8px;">Card</div>
  <script src="gsap.min.js"></script>
</body>
</html>`

// fetcher de prueba (DI — evita red real).
const fetchHtml = async (_url: string) => HTML

describe('dna scan determinista (AC-1)', () => {
  it('devuelve DnaResult con url y todas las dimensiones', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.url).toBe('https://example.com')
    expect(r.colors).toBeDefined()
    expect(r.typography).toBeDefined()
    expect(r.spacing).toBeDefined()
    expect(r.radius).toBeDefined()
    expect(r.shadows).toBeDefined()
    expect(r.effects).toBeDefined()
  })
})

describe('roles de color (AC-2)', () => {
  it('mismo input → mismo output (determinista)', async () => {
    const a = await dnaScan('https://example.com', fetchHtml)
    const b = await dnaScan('https://example.com', fetchHtml)
    expect(a).toEqual(b)
  })

  it('primary = color no-neutro más frecuente', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.colors.primary).toBe('#0ea5e9')
  })

  it('accent = color de botones/CTA', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.colors.accent).toBe('#f59e0b')
  })

  it('neutral incluye la escala de grises', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.colors.neutral).toContain('#ffffff')
    expect(r.colors.neutral).toContain('#6b7280')
    expect(r.colors.neutral).toContain('#1f2937')
  })

  it('semantic mapea success/error desde custom props', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.colors.semantic.success).toBe('#22c55e')
    expect(r.colors.semantic.error).toBe('#ef4444')
  })
})

describe('tipografía (AC-3)', () => {
  it('extrae font-families deduplicadas', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.typography.families).toContain('Inter')
  })

  it('typeScale incluye h1 y body con size/weight/line-height', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    const h1 = r.typography.typeScale['h1']
    expect(h1.size).toBe('40px')
    expect(h1.weight).toBe('700')
    const body = r.typography.typeScale['body']
    expect(body.size).toBe('16px')
    expect(body.weight).toBe('400')
    expect(body.lineHeight).toBe('1.6')
  })
})

describe('spacing base_unit (AC-4)', () => {
  it('gcd de paddings/margins/gaps → baseUnit', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.spacing.baseUnit).toBe(8)
  })
})

describe('radius (AC-5)', () => {
  it('dedupe y cluster de border-radius', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.radius.values).toContain(12)
    expect(r.radius.values).toContain(16)
  })
})

describe('shadows (AC-6)', () => {
  it('recolecta box-shadow', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.shadows.values.length).toBeGreaterThan(0)
  })
})

describe('efectos (AC-7)', () => {
  it('detecta canvas', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.effects.canvas).toBe(true)
  })

  it('detecta gsap en scripts', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.effects.gsap).toBe(true)
  })

  it('webgl/three false si ausentes', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.effects.webgl).toBe(false)
    expect(r.effects.three).toBe(false)
  })
})

describe('utilidades', () => {
  it('normalizeHex convierte formatos a #rrggbb', () => {
    expect(normalizeHex('#0ea5e9')).toBe('#0ea5e9')
    expect(normalizeHex('#fff')).toBe('#ffffff')
    expect(normalizeHex('rgb(14, 165, 233)')).toBe('#0ea5e9')
  })

  it('isNeutral detecta grises', () => {
    expect(isNeutral('#ffffff')).toBe(true)
    expect(isNeutral('#1f2937')).toBe(true)
    expect(isNeutral('#0ea5e9')).toBe(false)
  })

  it('gcd calcula el máximo común divisor', () => {
    expect(gcd([16, 8, 24])).toBe(8)
    expect(gcd([1, 2, 3])).toBe(1)
  })
})
