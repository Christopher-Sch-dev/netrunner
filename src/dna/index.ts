// rol: dna — ADN de diseño determinista (netrunner dna <url>, Wave J2, features/dna.feature).
// Extrae colores/tipografía/spacing/radius/shadows del HTML+CSS con un parser CSS mínimo
// propio (regex/tokenizer, sin dependencia pesada, sin LLM en el núcleo) y los normaliza a
// roles semánticos + escaneo booleano de efectos. (fundamento design-dna I2)
//
// SPEC (Mandamiento 0):
//   Como un agente que estudia webs para aprender cómo otros diseñaron,
//   quiero extraer el ADN de diseño de una web normalizado a roles semánticos,
//   para estudiar el design system de cualquier página de forma determinista.
// AC: features/dna.feature (AC-1..7).

// ---------- tipos ----------
export type HtmlFetcher = (url: string) => Promise<string>

export interface TypeToken {
  size?: string
  weight?: string
  lineHeight?: string
}

export interface DnaResult {
  url: string
  colors: {
    primary: string | null
    accent: string | null
    neutral: string[]
    semantic: Record<string, string>
  }
  typography: {
    families: string[]
    typeScale: Record<string, TypeToken>
  }
  spacing: { baseUnit: number | null }
  radius: { values: number[] }
  shadows: { values: string[] }
  effects: { canvas: boolean; webgl: boolean; gsap: boolean; three: boolean }
}

interface CssRule {
  selector: string
  decls: Record<string, string>
}

// ---------- utilidades (exportadas para test directo) ----------
/** rol: normaliza un color CSS (#hex, #rgb, rgb/rgba) a #rrggbb o null si no puede. */
export function normalizeHex(input: string): string | null {
  const v = input.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  const rgb = v.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgb) {
    return '#' + rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  }
  return null
}

/** rol: ¿el hex es un gris (canales ≈ iguales)? Umbral 30 captura escala neutral (white/gray/slate/stone) excluyendo colores reales. */
export function isNeutral(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return Math.max(r, g, b) - Math.min(r, g, b) <= 30
}

/** rol: máximo común divisor de una lista de enteros (base_unit de spacing). */
export function gcd(nums: number[]): number {
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b))
  return nums.reduce(g)
}

// ---------- parser CSS mínimo propio ----------
/** rol: convierte un bloque "prop:val;prop:val" a un objeto. */
function parseDecls(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of body.split(';')) {
    const i = part.indexOf(':')
    if (i === -1) continue
    const prop = part.slice(0, i).trim()
    const val = part.slice(i + 1).trim()
    if (prop) out[prop] = val
  }
  return out
}

/** rol: extrae reglas selector{decls} balanceadas; recursa dentro de @media/@supports. */
function parseRules(css: string): CssRule[] {
  const rules: CssRule[] = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) break
    const selector = css.slice(i, open).trim()
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(open + 1, j - 1)
    if (selector.startsWith('@')) rules.push(...parseRules(body))
    else if (selector) rules.push({ selector, decls: parseDecls(body) })
    i = j
  }
  return rules
}

// ---------- extracción de señales ----------
/** rol: recoge colores con frecuencia + accent (CTA) + semantic desde custom props. */
function extractColorDecls(rules: CssRule[]): {
  colors: Map<string, number>
  accent: string | null
  semantic: Record<string, string>
} {
  const colors = new Map<string, number>()
  let accent: string | null = null
  const semantic: Record<string, string> = {}
  const isCta = (sel: string) => /(button|\.btn|\.cta)/i.test(sel)
  const paintProps = ['color', 'background', 'background-color', 'border-color', 'fill', 'stroke']
  for (const r of rules) {
    for (const [prop, val] of Object.entries(r.decls)) {
      if (prop.startsWith('--color-')) {
        const key = prop.slice(8)
        if (['success', 'error', 'warning', 'info'].includes(key)) {
          const h = normalizeHex(val)
          if (h) semantic[key] = h
        }
        continue
      }
      if (!paintProps.includes(prop)) continue
      const h = normalizeHex(val)
      if (!h) continue
      colors.set(h, (colors.get(h) ?? 0) + 1)
      if (accent === null && isCta(r.selector) && ['background', 'background-color'].includes(prop) && !isNeutral(h)) {
        accent = h
      }
    }
  }
  return { colors, accent, semantic }
}

/** rol: extrae font-families + type scale (h1..h6, body/p). */
function extractTypography(rules: CssRule[]): DnaResult['typography'] {
  const families = new Set<string>()
  const generic = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'ui-sans-serif', 'sans'])
  const typeScale: Record<string, TypeToken> = {}
  for (const r of rules) {
    const ff = r.decls['font-family']
    if (ff) {
      const name = ff.split(',')[0].trim().replace(/['"]/g, '')
      if (name && !generic.has(name.toLowerCase())) families.add(name)
    }
    const key = r.selector.toLowerCase()
    if (!/^(h[1-6]|body|p)$/.test(key)) continue
    const target = key === 'p' ? 'body' : key
    const cur: TypeToken = (typeScale[target] ??= {})
    if (r.decls['font-size'] && !cur.size) cur.size = r.decls['font-size']
    if (r.decls['font-weight'] && !cur.weight) cur.weight = r.decls['font-weight']
    if (r.decls['line-height'] && !cur.lineHeight) cur.lineHeight = r.decls['line-height']
  }
  return { families: [...families], typeScale }
}

/** rol: recolecta valores de spacing (px int), border-radius y box-shadow. */
function extractMetrics(rules: CssRule[]): { spacing: number[]; radius: number[]; shadows: string[] } {
  const spacing: number[] = []
  const radius: number[] = []
  const shadows: string[] = []
  const px = (val: string): number | null => {
    const m = val.match(/-?\d+(?:\.\d+)?/)
    return m ? Number(m[0]) : null
  }
  for (const r of rules) {
    for (const [prop, val] of Object.entries(r.decls)) {
      if (/^(padding|margin|gap)/.test(prop)) {
        for (const p of val.split(/\s+/)) {
          const n = px(p)
          if (n !== null && Number.isInteger(n)) spacing.push(n)
        }
      } else if (prop === 'border-radius') {
        for (const p of val.split(/\s+/)) {
          const n = px(p)
          if (n !== null && n > 0 && !radius.includes(n)) radius.push(n)
        }
      } else if (prop === 'box-shadow') {
        shadows.push(val)
      }
    }
  }
  return { spacing, radius, shadows }
}

/** rol: escaneo booleano de efectos desde el HTML crudo. */
function scanEffects(html: string): DnaResult['effects'] {
  return {
    canvas: /<canvas[\s>]/i.test(html),
    webgl: /getContext\(['"]webgl|\.webgl/i.test(html),
    gsap: /gsap\.min\.js|\bgsap\b/i.test(html),
    three: /three(\.min)?\.js|\bTHREE\b/i.test(html),
  }
}

// ---------- entrada principal ----------
/** rol: escanea el ADN de diseño de una URL (AC-1..7). Fetcher inyectado por DI (sin red dura). */
export async function dnaScan(url: string, fetcher: HtmlFetcher): Promise<DnaResult> {
  const html = await fetcher(url)
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
  const inlineStyles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1])
  const rules: CssRule[] = [
    ...styleBlocks.flatMap(parseRules),
    ...inlineStyles.map((s) => ({ selector: 'inline', decls: parseDecls(s) })),
  ]
  const { colors, accent, semantic } = extractColorDecls(rules)

  // primary = color no-neutro más frecuente que no sea el accent.
  let primary: string | null = null
  let best = 0
  for (const [h, c] of colors) {
    if (isNeutral(h) || h === accent) continue
    if (c > best) {
      best = c
      primary = h
    }
  }
  const neutral = [...colors.keys()].filter(isNeutral).sort()
  const metrics = extractMetrics(rules)

  return {
    url,
    colors: { primary, accent, neutral, semantic },
    typography: extractTypography(rules),
    spacing: { baseUnit: metrics.spacing.length ? gcd(metrics.spacing) : null },
    radius: { values: metrics.radius },
    shadows: { values: metrics.shadows },
    effects: scanEffects(html),
  }
}
