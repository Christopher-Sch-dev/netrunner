// rol: dna — ADN de diseño determinista (netrunner dna <url>, Wave J2 + K2).
// Extrae colores/tipografía/spacing/radius/shadows del HTML+CSS con un parser CSS
// mínimo propio (regex/tokenizer, sin dependencia pesada, sin LLM en el núcleo) y
// los normaliza a roles semánticos + escaneo booleano de efectos.
// Wave K2 (investigador profundo, papers 2601.19117 + DTCG W3C):
//   - roles por área×frecuencia + posición CTA en espacio OKLab (perceptivo),
//   - type scale por regresión log-lineal (R², modular vs custom),
//   - markers off-system de spacing (valores fuera del grid dominante),
//   - emisores DTCG W3C (design-tokens.json / variables.css / design.md).
// (fundamento design-dna I2; features/dna.feature)
//
// SPEC (Mandamiento 0):
//   Como un agente que estudia webs para aprender cómo otros diseñaron,
//   quiero extraer el ADN de diseño de una web normalizado a roles semánticos,
//   para estudiar el design system de cualquier página de forma determinista.
// AC: features/dna.feature (AC-1..7 + AC-K2-*).

export type { Oklab, OklabCluster } from './oklab'
export { hexToOklab, oklabDistance, clusterOklab } from './oklab'
export type { TypeScaleAnalysis } from './typeScale'
export { analyzeTypeScale } from './typeScale'
export { emitDesignTokensJson, emitVariablesCss, emitDesignMd } from './dtcg'

import { clusterOklab } from './oklab'
import { analyzeTypeScale } from './typeScale'
import type { OklabCluster } from './oklab'
import type { TypeScaleAnalysis } from './typeScale'

export interface TypeToken {
  size?: string
  weight?: string
  lineHeight?: string
}

export type HtmlFetcher = (url: string) => Promise<string>

export interface DnaResult {
  url: string
  colors: {
    primary: string | null
    accent: string | null
    neutral: string[]
    semantic: Record<string, string>
    clusters: OklabCluster[]
  }
  typography: {
    families: string[]
    typeScale: Record<string, TypeToken>
    typeScaleAnalysis: TypeScaleAnalysis
  }
  spacing: { baseUnit: number | null; offSystem: number[] }
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

// ---------- área proxy (Wave K2) ----------
/** rol: proxy determinista de área por regla: base 1 + padding + bonus de contenedor grande. */
function areaProxy(selector: string, decls: Record<string, string>): number {
  let area = 1
  const pad = decls['padding']
  if (pad) {
    const m = pad.match(/\d+(?:\.\d+)?/)
    if (m) area += Number(m[0])
  }
  // hero/header/section/main/card/banner/footer/container = contenedores grandes.
  if (/hero|header|section|main|banner|footer|card|\.container|\.wrap|\.shell/i.test(selector)) {
    area *= 2
  }
  return area
}

// ---------- extracción de señales ----------
/** rol: recoge colores con frecuencia × área proxy + semantic desde custom props. */
function extractColorDecls(
  rules: CssRule[],
  accent: string | null,
): {
  colors: Map<string, number>
  semantic: Record<string, string>
} {
  const colors = new Map<string, number>()
  const semantic: Record<string, string> = {}
  const paintProps = ['color', 'background', 'background-color', 'border-color', 'fill', 'stroke']
  for (const r of rules) {
    const area = areaProxy(r.selector, r.decls)
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
      colors.set(h, (colors.get(h) ?? 0) + area)
    }
  }
  // el accent CTA no compite por primary.
  if (accent) colors.delete(accent)
  return { colors, semantic }
}

/** rol: detecta el accent por posición CTA: primer button/a con bg != surface en orden DOM. */
function detectCtaAccent(html: string, rules: CssRule[], surface: string | null): string | null {
  const tagRe = /<(button|a)\b([^>]*)>/gi
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html)) !== null) {
    const attrs = m[2]
    const clsM = attrs.match(/class=["']([^"']*)["']/i)
    const classes = clsM ? clsM[1].split(/\s+/) : []
    const styleM = attrs.match(/style=["']([^"']*)["']/i)
    const inline = styleM ? parseDecls(styleM[1]) : {}
    let bg = normalizeHex(inline['background'] ?? inline['background-color'] ?? '')
    if (!bg) {
      for (const r of rules) {
        if (classes.some((c) => c && r.selector.includes(c))) {
          bg = normalizeHex(r.decls['background'] ?? r.decls['background-color'] ?? '')
          if (bg) break
        }
      }
    }
    if (bg && !isNeutral(bg) && bg !== surface) return bg
  }
  return null
}

/** rol: estima el color de superficie (fondo neutro más frecuente entre las reglas). */
function detectSurfaceColors(rules: CssRule[]): string | null {
  const counts = new Map<string, number>()
  for (const r of rules) {
    const bg = normalizeHex(r.decls['background'] ?? r.decls['background-color'] ?? '')
    if (bg && isNeutral(bg)) counts.set(bg, (counts.get(bg) ?? 0) + 1)
  }
  let surface: string | null = null
  let best = 0
  for (const [h, c] of counts) {
    if (c > best) {
      best = c
      surface = h
    }
  }
  return surface
}

/** rol: extrae font-families + type scale (h1..h6, body/p) + análisis log-lineal. */
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
  const sizes: Record<string, string> = {}
  for (const [k, t] of Object.entries(typeScale)) if (t.size) sizes[k] = t.size
  const typeScaleAnalysis = analyzeTypeScale(sizes)
  return { families: [...families], typeScale, typeScaleAnalysis }
}

/** rol: recolecta valores de spacing (px int), radius y shadows + marca off-system. */
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
          if (n !== null && Number.isInteger(n) && n > 0) spacing.push(n)
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

/** rol: grid dominante + off-system. base = mayor divisor de la mayoría de valores; offSystem = valores no múltiplos de ese grid. */
function dominantGrid(spacing: number[]): { base: number; offSystem: number[] } {
  const distinct = [...new Set(spacing)].filter((n) => n > 0)
  if (distinct.length === 0) return { base: 1, offSystem: [] }
  if (distinct.length === 1) return { base: distinct[0], offSystem: [] }
  let base = 1
  let bestCount = 0
  for (const cand of distinct) {
    const count = spacing.filter((n) => n % cand === 0).length
    // desempata por candidato mayor: grids reales > 1
    if (count > bestCount || (count === bestCount && cand > base)) {
      base = cand
      bestCount = count
    }
  }
  const offSystem = [...new Set(spacing.filter((n) => n % base !== 0))].sort((a, b) => a - b)
  return { base, offSystem }
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
/** rol: escanea el ADN de diseño de una URL (AC-1..7 + AC-K2-*). Fetcher inyectado por DI (sin red dura). */
export async function dnaScan(url: string, fetcher: HtmlFetcher): Promise<DnaResult> {
  const html = await fetcher(url)
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
  const inlineStyles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1])
  const rules: CssRule[] = [
    ...styleBlocks.flatMap(parseRules),
    ...inlineStyles.map((s) => ({ selector: 'inline', decls: parseDecls(s) })),
  ]

  // accent por posición CTA (primer button/a con bg != surface).
  const surface = detectSurfaceColors(rules)
  const accent = detectCtaAccent(html, rules, surface)
  const { colors, semantic } = extractColorDecls(rules, accent)

  // primary = cluster OKLab no-neutral de mayor peso área×frecuencia (excluye accent).
  const weights = new Map<string, number>()
  for (const [h, c] of colors) if (!isNeutral(h)) weights.set(h, c)
  const clusters = clusterOklab([...weights.keys()], weights)
  const primary = clusters.length ? clusters[0].hexes[0] : null

  const neutral = [...colors.keys()].filter(isNeutral).sort()
  const metrics = extractMetrics(rules)
  const { base, offSystem } = dominantGrid(metrics.spacing)

  return {
    url,
    colors: { primary, accent, neutral, semantic, clusters },
    typography: extractTypography(rules),
    spacing: { baseUnit: metrics.spacing.length ? base : null, offSystem },
    radius: { values: metrics.radius },
    shadows: { values: metrics.shadows },
    effects: scanEffects(html),
  }
}
