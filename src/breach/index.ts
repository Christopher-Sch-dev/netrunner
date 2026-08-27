/**
 * rol: breach — descifrar un repo desconocido (features/breach.feature).
 * LA VISION (Breach Protocol, mina #9): el netrunner descifra la NET del proyecto
 * antes de operar. Secuencia determinista: framework/stack → ramas git → servicios
 * → exponer el deck (snapshot). El agente entiende QUÉ puede operar.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que breach descifre un repo desconocido en secuencia determinista,
 *   para entender la NET del proyecto antes de operar.
 *
 * AC (features/breach.feature):
 *   AC-1 breach(dir) → { stack, git, services, snapshot }.
 *   AC-2 detecta el framework/stack.
 *   AC-3 detecta ramas git + remoto.
 *   AC-4 detecta servicios.
 *   AC-5 resumen accionable.
 */
import { detectStack } from '../context/detect'
import { gitInfo } from '../context/git'
import { servicesInfo } from '../context/services'
import { buildSnapshot } from '../context/snapshot'

/** rol: breach — descifra el repo en secuencia determinista (AC-1..5). */
export async function breach(projectDir: string): Promise<{
  stack: Awaited<ReturnType<typeof detectStack>>
  git: ReturnType<typeof gitInfo>
  services: ReturnType<typeof servicesInfo>
  snapshot: Awaited<ReturnType<typeof buildSnapshot>>
  summary: string
}> {
  // secuencia determinista: stack → git → services → snapshot
  const stack = await detectStack(projectDir)
  const git = gitInfo(projectDir)
  const services = servicesInfo(projectDir)
  const snapshot = await buildSnapshot(projectDir)

  // resumen accionable (AC-5): qué puede operar el agente
  const langs = stack.language ?? 'desconocido'
  const branch = git.branch ?? 'sin git'
  const svc = services.services.length > 0 ? services.services.map((s) => s.name).join(', ') : 'ninguno'
  const summary = `Stack: ${langs} · Rama: ${branch} · Servicios: ${svc} · ${snapshot.coverage.lines}% cobertura`

  return { stack, git, services, snapshot, summary }
}
