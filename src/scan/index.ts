/**
 * rol: scan — overlay de info del proyecto (mina cyberpunk feature #23).
 * Devuelve un resumen unificado del proyecto (stack + git + versions + coverage +
 * services + todos) en una llamada — la "Smartlink/Kiroshi" que proyecta una capa
 * de datos útiles sobre el repo. Reutiliza los detectores existentes (no duplica).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero un resumen overlay del proyecto en una llamada,
 *   para que el agente "mire" el repo y proyecte datos útiles.
 *
 * AC (features/scan.feature):
 *   AC-1 scanProject(dir) → stack + git + versions + coverage + services + todos.
 *   AC-2 sin datos → defaults (no falla).
 *   AC-3 output TOON.
 *   AC-4 reutiliza los detectores.
 */
import { detectStack } from '../context/detect'
import { gitInfo } from '../context/git'
import { versionsInfo } from '../context/versions'
import { coverageInfo } from '../context/coverage'
import { servicesInfo } from '../context/services'
import { todosInfo } from '../context/todos'

/** Overlay de info del proyecto. */
export interface ScanResult {
  stack: Awaited<ReturnType<typeof detectStack>>
  git: ReturnType<typeof gitInfo>
  versions: ReturnType<typeof versionsInfo>
  coverage: ReturnType<typeof coverageInfo>
  services: ReturnType<typeof servicesInfo>
  todos: ReturnType<typeof todosInfo>
}

/** rol: devuelve el overlay del proyecto (unifica detectores, AC-1/4). */
export async function scanProject(projectDir: string): Promise<ScanResult> {
  return {
    stack: await detectStack(projectDir),
    git: gitInfo(projectDir),
    versions: versionsInfo(projectDir),
    coverage: coverageInfo(projectDir),
    services: servicesInfo(projectDir),
    todos: todosInfo(projectDir),
  }
}
