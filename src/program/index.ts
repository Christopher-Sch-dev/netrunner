/**
 * rol: program.md — el contrato del programa (features/program.feature).
 * LA VISION: el agente lee el contrato al conectar y sabe exactamente qué puede
 * hacer. `init` genera program.md con nombre, descripción, comandos y tools.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que init genere un program.md con el contrato del programa,
 *   para saber exactamente qué puedo hacer al conectar.
 *
 * AC (features/program.feature):
 *   AC-1 writeProgram(dir) genera program.md.
 *   AC-2 incluye nombre, comandos, tools.
 *   AC-3 idempotente.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** rol: genera el contrato del programa (AC-1/2/3). */
export function writeProgram(projectDir: string): string {
  const content = [
    '# Netrunner Program',
    '',
    'This project is operable by AI agents via Netrunner.',
    '',
    '## Commands',
    '- `netrunner status` — project snapshot (stack, git, coverage)',
    '- `netrunner explore <sym>` — symbol + callers/callees',
    '- `netrunner plan "<goal>"` — actionable plan from the graph',
    '- `netrunner ops <test|build|lint>` — operate the project',
    '- `netrunner guard` — security check (secrets, broken imports)',
    '- `netrunner resume` — reload the deck state',
    '',
    '## Tools',
    '- graph.explore, graph.callers, graph.impact',
    '- stack.info, search.rg',
    '- ops.test, ops.build, ops.lint',
    '- guard, policy',
    '',
  ].join('\n')
  const path = join(projectDir, 'program.md')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return path
}
