/**
 * rol: Snapshot store de Netrunner (Wave 6 — skill auto-generante).
 * Une los detectores (git, versions, coverage, services, dirs, todos) en un
 * ProjectSnapshot persistido en `.netrunner/state/project.json`. Es el "sticky
 * note" vivo y progresivo del proyecto que Cris quiere: la skill auto-generante
 * lee este snapshot para documentar todo al día.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero un snapshot del estado del proyecto (rama, versiones, cobertura,
 *   servicios, árbol, pendientes),
 *   para que la skill auto-generante lea un sticky note vivo y progresivo.
 *
 * AC (features/snapshot.feature):
 *   AC-1 buildSnapshot(dir) une los detectores.
 *   AC-2 saveSnapshot persiste en .netrunner/state/project.json.
 *   AC-3 loadSnapshot lee (o null si no existe).
 *   AC-4 snapshot con mtime (para incremental).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { gitInfo } from './git'
import { versionsInfo } from './versions'
import { coverageInfo } from './coverage'
import { servicesInfo } from './services'
import { dirsTree } from './dirs'
import { todosInfo } from './todos'

/** Snapshot del estado del proyecto (une todos los detectores). */
export interface ProjectSnapshot {
  git: ReturnType<typeof gitInfo>
  versions: ReturnType<typeof versionsInfo>
  coverage: ReturnType<typeof coverageInfo>
  services: ReturnType<typeof servicesInfo>
  dirs: string[]
  todos: ReturnType<typeof todosInfo>
  mtime: number
}

/** rol: construye el snapshot del proyecto (une los detectores, AC-1). */
export function buildSnapshot(projectDir: string): ProjectSnapshot {
  return {
    git: gitInfo(projectDir),
    versions: versionsInfo(projectDir),
    coverage: coverageInfo(projectDir),
    services: servicesInfo(projectDir),
    dirs: dirsTree(projectDir),
    todos: todosInfo(projectDir),
    mtime: Date.now(),
  }
}

/** rol: persiste el snapshot en .netrunner/state/project.json (AC-2). */
export function saveSnapshot(projectDir: string, snapshot: ProjectSnapshot): string {
  const path = join(projectDir, '.netrunner', 'state', 'project.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(snapshot, null, 2))
  return path
}

/** rol: lee el snapshot persistido (o null si no existe, AC-3). */
export function loadSnapshot(projectDir: string): ProjectSnapshot | null {
  const path = join(projectDir, '.netrunner', 'state', 'project.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ProjectSnapshot
  } catch {
    return null
  }
}
