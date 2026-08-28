// rol: okLab — conversión perceptiva de color + clusterización (paper 2601.19117).
// OKLab (Björn Ottosson) separa la luz (L) de la cromatividad (a,b) de forma
// perceptivamente uniforme: la distancia euclidiana ≈ diferencia percibida.
// Se implementa la fórmula simple sin dependencias (matrices OKLab estándar).
// No usa `Math.cbrt` polyfill — Bun/Node la soportan nativamente.

export type Oklab = [number, number, number]

/** rol: convierte #rrggbb a sRGB lineal [0..1]. */
function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** rol: hex #rrggbb → OKLab [L, a, b] con L ∈ [0,1], determinista, sin dep. */
export function hexToOklab(hex: string): Oklab {
  const n = parseInt(hex.slice(1), 16)
  const r = srgbToLinear((n >> 16) & 255)
  const g = srgbToLinear((n >> 8) & 255)
  const b = srgbToLinear(n & 255)

  // matriz sRGB lineal → LMS (OKLab)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return [L, a, b_]
}

/** rol: distancia euclidiana en OKLab (≈ diferencia perceptiva). */
export function oklabDistance(p: Oklab, q: Oklab): number {
  const dL = p[0] - q[0]
  const da = p[1] - q[1]
  const db = p[2] - q[2]
  return Math.sqrt(dL * dL + da * da + db * db)
}

export interface OklabCluster {
  center: Oklab
  hexes: string[]
  weight: number
}

/**
 * rol: clusteriza hexes por proximidad perceptiva OKLab (greedy simple, sin dep).
 * Umbral por defecto 0.08 (ΔE OKLab) agrupa variaciones del mismo matiz sin
 * mezclar matices distintos. `weights` (hex→área×frecuencia) pondera cada punto.
 */
export function clusterOklab(hexes: string[], weights?: Map<string, number>): OklabCluster[] {
  const clusters: OklabCluster[] = []
  const THRESHOLD = 0.11
  for (const hex of hexes) {
    const pt = hexToOklab(hex)
    const w = weights?.get(hex) ?? 1
    let placed = false
    for (const c of clusters) {
      if (oklabDistance(c.center, pt) <= THRESHOLD) {
        c.hexes.push(hex)
        c.weight += w
        // recentra al promedio de los miembros
        let L = 0
        let a = 0
        let b = 0
        for (const h of c.hexes) {
          const p = hexToOklab(h)
          L += p[0]
          a += p[1]
          b += p[2]
        }
        const n = c.hexes.length
        c.center = [L / n, a / n, b / n]
        placed = true
        break
      }
    }
    if (!placed) clusters.push({ center: pt, hexes: [hex], weight: w })
  }
  return clusters.sort((x, y) => y.weight - x.weight)
}
