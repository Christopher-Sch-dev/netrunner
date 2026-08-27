/**
 * rol: naming cyberpunk — aliases jack/quickhacks/ice + estado del deck (features/naming.feature).
 * LA VISION (la "forma de contar", fix auditor de visión): el CLI habla el lenguaje del
 * cyberdeck de Night City. `jack`=init, `quickhacks`=ops, `ice`=guard. `deck` muestra
 * el estado del deck (quickhacks disponibles, daemons activos, canon pendiente).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el CLI hable el lenguaje del cyberdeck,
 *   para que el agente y el usuario SIENTAN que es un cyberdeck, no otro CLI de DevOps.
 *
 * AC (features/naming.feature):
 *   AC-1 aliases: jack=init, quickhacks=ops, ice=guard.
 *   AC-2 deck muestra quickhacks + daemons + canon pendiente.
 *   AC-3 aliases devuelven el mismo output que el comando original.
 *   AC-4 determinista.
 */

/** Mapa de aliases cyberpunk → comando real (AC-1). quickhacks es un comando propio (lista con costo). */
const ALIASES: Record<string, string> = {
  jack: 'init',
  ice: 'guard',
}

/** rol: resuelve un alias cyberpunk al comando real (AC-1/3/4). */
export function resolveAlias(cmd: string): string {
  return ALIASES[cmd] ?? cmd
}

/** Estado del deck (AC-2). */
export interface DeckState {
  quickhacks: string[]
  daemons: string[]
  canonStale: boolean
}

/** rol: construye el estado del deck (AC-2). */
export function deckState(input: { quickhacks: string[]; daemons: string[]; canonStale: boolean }): DeckState {
  return {
    quickhacks: input.quickhacks,
    daemons: input.daemons,
    canonStale: input.canonStale,
  }
}
