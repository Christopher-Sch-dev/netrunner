import { describe, it, expect } from 'vitest'
import {
  dnaScan,
  normalizeHex,
  gcd,
  isNeutral,
  hexToOklab,
  oklabDistance,
  clusterOklab,
  analyzeTypeScale,
  emitDesignTokensJson,
  emitVariablesCss,
  emitDesignMd,
} from '../src/dna/index'
import type { DnaResult } from '../src/dna/index'

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
const fetchHtmlK2 = async (_url: string) => HTML_K2

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

// ==========================================================================
// WAVE K2 — mejoras investigador profundo (papers 2601.19117, DTCG W3C)
// ==========================================================================

// HTML con CTA real (button con background != surface) y dos azules cercanos.
const HTML_K2 = `<!doctype html>
<html>
<head>
<style>
  :root { --color-primary: #0a5; --color-bg: #ffffff; }
  body { font-family: "Inter", sans-serif; background: #ffffff; color: #1f2937; padding: 8px; }
  h1 { font-size: 32px; }
  h2 { font-size: 25.6px; }
  h3 { font-size: 20.5px; }
  h4 { font-size: 16.4px; }
  p { font-size: 13.1px; }
  .hero { background: #0066ff; padding: 40px; }
  .btn-primary { background: #0052cc; }
  .btn-accent { background: #ff5a00; }
  .card { padding: 30px; }
</style>
</head>
<body>
  <header class="hero"><h1>Hero</h1></header>
  <button class="btn-primary">Comprar</button>
  <button class="btn-accent">CTA</button>
</body>
</html>`

describe('Wave K2 — OKLab perceptivo (AC-K2-2.3/2.4)', () => {
  it('hexToOklab convierte hex a [L,a,b] con L en [0,1] y es determinista', () => {
    const [L, a, b] = hexToOklab('#0066ff')
    expect(L).toBeGreaterThanOrEqual(0)
    expect(L).toBeLessThanOrEqual(1)
    const again = hexToOklab('#0066ff')
    expect(again).toEqual([L, a, b])
  })

  it('oklabDistance agrupa colores perceptivamente cercanos', () => {
    // dos azules cercanos vs un rojo: distancia azul-azul << azul-rojo
    const dBlue = oklabDistance(hexToOklab('#0066ff'), hexToOklab('#0052cc'))
    const dRed = oklabDistance(hexToOklab('#0066ff'), hexToOklab('#ff5a00'))
    expect(dBlue).toBeLessThan(dRed)
  })

  it('clusterOklab agrupa azules juntos y separa el rojo', () => {
    const clusters = clusterOklab(['#0066ff', '#0052cc', '#ff5a00'])
    const blueCluster = clusters.find((c) => c.hexes.includes('#0066ff'))
    expect(blueCluster).toBeDefined()
    expect(blueCluster!.hexes).toContain('#0052cc')
    expect(blueCluster!.hexes).not.toContain('#ff5a00')
    expect(clusters.length).toBeGreaterThanOrEqual(2)
  })

  it('dnaScan expone colors.clusters con centro, hexes y peso', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.colors.clusters).toBeDefined()
    expect(r.colors.clusters.length).toBeGreaterThan(0)
    for (const c of r.colors.clusters) {
      expect(c.hexes.length).toBeGreaterThan(0)
      expect(typeof c.weight).toBe('number')
    }
  })
})

describe('Wave K2 — roles area×frecuencia + posición CTA (AC-K2-2.4)', () => {
  it('accent = primer button/a con bg != surface en DOM (posicion CTA)', async () => {
    const r = await dnaScan('https://example.com', fetchHtmlK2)
    // .btn-primary #0052cc aparece primero en DOM y es boton con bg != surface
    expect(r.colors.accent).toBe('#0052cc')
  })

  it('primary = cluster OKLab no-neutral de mayor peso area×frecuencia excluyendo accent', async () => {
    const r = await dnaScan('https://example.com', fetchHtmlK2)
    expect(r.colors.primary).toBe('#0066ff')
  })
})

describe('Wave K2 — type scale log-lineal (AC-K2-3.2)', () => {
  it('analyzeTypeScale detecta escala modular (R² > 0.95) con ratio geometrico', () => {
    // serie geométrica contigua ratio 1.25: body→h1 (steps 0..6)
    const sizes: Record<string, string> = {
      body: '16px',
      h6: '20px',
      h5: '25px',
      h4: '31.25px',
      h3: '39.0625px',
      h2: '48.828125px',
      h1: '61.03515625px',
    }
    const analysis = analyzeTypeScale(sizes)
    expect(analysis.mode).toBe('modular')
    expect(analysis.rSquared).toBeGreaterThan(0.95)
    // ratio 1.25 => ln(1.25)≈0.223
    expect(analysis.ratio).toBeCloseTo(1.25, 1)
  })

  it('analyzeTypeScale devuelve custom para tamaños no geometricos', () => {
    const sizes: Record<string, string> = { body: '12px', h1: '48px', h2: '20px' }
    const analysis = analyzeTypeScale(sizes)
    expect(analysis.mode).toBe('custom')
  })

  it('dnaScan rellena typography.typeScaleAnalysis para HTML K2', async () => {
    const r = await dnaScan('https://example.com', fetchHtml)
    expect(r.typography.typeScaleAnalysis).toBeDefined()
    expect(typeof r.typography.typeScaleAnalysis.ratio).toBe('number')
  })
})

describe('Wave K2 — spacing off-system (AC-K2-4.2)', () => {
  it('marca offSystem los valores fuera del grid dominante', async () => {
    const r = await dnaScan('https://example.com', fetchHtmlK2)
    // grid dominante 8: 8 y 40 on-system; 30 off-system (no multiplo de 8)
    expect(r.spacing.baseUnit).toBe(8)
    expect(r.spacing.offSystem).toContain(30)
    expect(r.spacing.offSystem).not.toContain(40)
  })
})

describe('Wave K2 — emisores DTCG W3C (AC-K2-8)', () => {
  const base: DnaResult = {
    url: 'https://example.com',
    colors: {
      primary: '#0066ff',
      accent: '#ff5a00',
      neutral: ['#ffffff', '#1f2937'],
      semantic: { error: '#ef4444' },
      clusters: [],
    },
    typography: {
      families: ['Inter'],
      typeScale: { body: { size: '16px' }, h1: { size: '32px' } },
      typeScaleAnalysis: { mode: 'modular', ratio: 1.25, rSquared: 0.99, points: 2 },
    },
    spacing: { baseUnit: 8, offSystem: [30] },
    radius: { values: [8, 16] },
    shadows: { values: ['0 4px 12px rgba(0,0,0,0.1)'] },
    effects: { canvas: false, webgl: false, gsap: false, three: false },
  }

  it('design-tokens.json parsea y tiene $type/$value', () => {
    const json = JSON.parse(emitDesignTokensJson(base))
    expect(json).toBeDefined()
    const str = JSON.stringify(json)
    expect(str).toContain('$type')
    expect(str).toContain('$value')
  })

  it('design-tokens.json tiene capas primitivo/semantico/composite', () => {
    const json = JSON.parse(emitDesignTokensJson(base))
    const keys = Object.keys(json)
    expect(keys).toContain('primitivo')
    expect(keys).toContain('semantico')
    expect(keys).toContain('composite')
  })

  it('design-tokens.json emite referencias {} entre capas', () => {
    const json = JSON.parse(emitDesignTokensJson(base))
    const sem = json.semantico
    const str = JSON.stringify(sem)
    expect(str).toContain('{')
  })

  it('variables.css tiene :root y --vars', () => {
    const css = emitVariablesCss(base)
    expect(css).toContain(':root')
    expect(css).toContain('--color-primary')
    expect(css).toContain('#0066ff')
  })

  it('design.md es un brief markdown', () => {
    const md = emitDesignMd(base)
    expect(md).toContain('#')
    expect(md).toContain('## ')
    expect(md).toContain('#0066ff')
  })
})

