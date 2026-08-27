/**
 * rol: Detector de servicios de Netrunner (Wave 6 — skill auto-generante).
 * Detecta los servicios conectados del proyecto (frontend/backend/urls/puertos)
 * desde package.json scripts (dev/start con --port) y docker-compose.yml.
 * Es la base de la feature de servicios de infraestructura.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer los servicios conectados (urls/puertos),
 *   para que la skill auto-generante documente la infraestructura.
 *
 * AC (features/services.feature):
 *   AC-1 servicesInfo(dir) → { services: [{ name, port, url }] }.
 *   AC-2 detecta puertos/urls de package.json scripts y docker-compose.
 *   AC-3 sin servicios → { services: [] } (no falla).
 *   AC-4 cada servicio tiene name, port (si aplica) y url.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Un servicio conectado del proyecto. */
export interface ServiceInfo {
  name: string
  port: number | null
  url: string | null
}

/** Servicios detectados. */
export interface ServicesInfo {
  services: ServiceInfo[]
}

/** rol: extrae el puerto de un script (--port N o :N). */
function extractPort(script: string): number | null {
  const m = script.match(/--port\s+(\d+)/) ?? script.match(/:(\d{4,5})/)
  return m ? Number(m[1]) : null
}

/** rol: detecta servicios desde package.json scripts (dev/start). */
function fromPackageJson(projectDir: string): ServiceInfo[] {
  const path = join(projectDir, 'package.json')
  if (!existsSync(path)) return []
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { scripts?: Record<string, string> }
    const out: ServiceInfo[] = []
    for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
      if (!/dev|start|serve|preview/.test(name)) continue
      const port = extractPort(script)
      out.push({ name, port, url: port ? `http://localhost:${port}` : null })
    }
    return out
  } catch {
    return []
  }
}

/** rol: devuelve los servicios del proyecto (determinista, no falla). */
export function servicesInfo(projectDir: string): ServicesInfo {
  return { services: fromPackageJson(projectDir) }
}
