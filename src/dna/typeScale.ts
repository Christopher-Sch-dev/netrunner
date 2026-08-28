// rol: typeScale — regresión log-lineal del type scale (ln(size) vs step).
// Si los tamaños siguen una progresión geométrica, ln(size) es lineal en el
// step; la pendiente = ln(ratio). R² mide bondad de ajuste: >0.95 → 'modular',
// si no 'custom'. Con <2 puntos → 'single' (no se puede ajustar una recta).
// Sin dependencias (mínimos cuadrados inline).

export interface TypeScaleAnalysis {
  mode: 'modular' | 'custom' | 'single'
  ratio: number | null
  rSquared: number | null
  points: number
}

/** rol: parsea un font-size CSS ("13.1px", "1.25rem") a px numérico o null. */
function parsePx(size: string): number | null {
  const m = size.trim().match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  if (m[0].endsWith('rem')) return n * 16
  return n
}

/**
 * rol: ajusta una recta por mínimos cuadrados a (step, ln(size)) y devuelve
 * ratio = exp(slope), R² y el modo. `steps` ordena de menor a mayor tamaño.
 */
export function analyzeTypeScale(
  sizes: Record<string, string>,
  steps?: Record<string, number>,
): TypeScaleAnalysis {
  const stepFor = steps ?? { body: 0, p: 0, h6: 1, h5: 2, h4: 3, h3: 4, h2: 5, h1: 6 }
  const pts: Array<[number, number]> = []
  for (const [key, raw] of Object.entries(sizes)) {
    const px = parsePx(raw)
    const step = stepFor[key.toLowerCase()]
    if (px !== null && px > 0 && step !== undefined) pts.push([step, Math.log(px)])
  }
  if (pts.length < 2) return { mode: 'single', ratio: null, rSquared: null, points: pts.length }

  // mínimos cuadrados: y = a + b*x
  const n = pts.length
  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  for (const [x, y] of pts) {
    sx += x
    sy += y
    sxy += x * y
    sxx += x * x
  }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const a = (sy - b * sx) / n
  const ratio = Math.exp(b)

  // R² = 1 - SS_res / SS_tot
  const meanY = sy / n
  let ssRes = 0
  let ssTot = 0
  for (const [x, y] of pts) {
    const yHat = a + b * x
    ssRes += (y - yHat) * (y - yHat)
    ssTot += (y - meanY) * (y - meanY)
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  const mode: TypeScaleAnalysis['mode'] = rSquared > 0.95 ? 'modular' : 'custom'
  return { mode, ratio, rSquared, points: pts.length }
}
