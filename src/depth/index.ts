/**
 * rol: depth — disclosure por niveles de Netrunner (mina cyberpunk feature #5).
 * Consulta un símbolo por NIVELES (L0→L3), pagando tokens solo por la profundidad
 * necesaria (los "floors" de la NET Architecture). Reutiliza queries.ts.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero consultar un símbolo por niveles de profundidad,
 *   para pagar tokens solo por lo que necesito.
 *
 * AC (features/depth.feature):
 *   AC-1 depthQuery(symbol, level, dir) → info según nivel.
 *   AC-2 L0 básico; L1 +firma; L2 +callers; L3 +impact.
 *   AC-3 nivel inválido → error; no encontrado → { found: false }.
 *   AC-4 acotado (cada nivel agrega solo lo suyo).
 */
import { explore, callers, impact } from '../context/queries'

/** Resultado de depthQuery. */
export interface DepthResult {
  found: boolean
  name?: string
  kind?: string
  file?: string
  line?: number
  callers?: unknown[]
  impact?: unknown[]
}

/** rol: consulta un símbolo por nivel de profundidad (determinista, AC-1..4). */
export async function depthQuery(symbol: string, level: number, projectDir: string): Promise<DepthResult> {
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error(`nivel inválido: '${level}' (usa 0-3)`)
  }
  const res = await explore(symbol, projectDir)
  const node = res.nodes?.[0]
  if (!node) return { found: false }

  const base: DepthResult = {
    found: true,
    name: node.name,
    kind: node.kind,
    file: node.file,
    line: node.line,
  }
  if (level === 0) return base // L0: solo básico (AC-2)

  // callers/impact esperan el ID completo del nodo (no el nombre)
  const nodeId = node.id

  // L2: + callers
  if (level >= 2) {
    const c = await callers(nodeId, projectDir)
    base.callers = c.nodes ?? []
  }
  // L3: + impact (blast radius)
  if (level >= 3) {
    const im = await impact(nodeId, projectDir, 2)
    base.impact = im.nodes ?? []
  }
  return base
}
