/**
 * rol: net mode — el modo del deck (features/net-mode.feature).
 * LA VISION (Wintermute/Neuromancer): el deck se adapta al objetivo. El agente
 * carga solo el perfil que necesita: explore (graph/read), operate (ops),
 * audit (guard/policy). RAM finita — no expone tools que no aplican al modo.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el deck tenga un modo que cambia el perfil de tools,
 *   para cargar solo el perfil que necesito.
 *
 * AC (features/net-mode.feature):
 *   AC-1 netMode(profile) → tools del perfil.
 *   AC-2 perfil desconocido → explore (default).
 *   AC-3 determinista.
 */

/** Tools por perfil (AC-1). */
const PROFILES: Record<string, string[]> = {
  explore: ['graph.explore', 'graph.callers', 'stack.info', 'search.rg'],
  operate: ['ops.test', 'ops.build', 'ops.lint', 'graph.impact'],
  audit: ['guard', 'policy', 'graph.explore', 'stack.info'],
}

/** rol: tools del perfil (AC-1/2/3). */
export function netMode(profile: string): string[] {
  return PROFILES[profile] ?? PROFILES.explore
}
