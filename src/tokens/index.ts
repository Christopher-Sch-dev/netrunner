/**
 * rol: token-counting — estimar tokens del output (features/tokens.feature).
 * LA VISION (Netdeck): RAM finita — el agente sabe cuánto contexto va a pagar.
 * Estimación aproximada (4 chars/token, regla común para texto en inglés/código).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero estimar los tokens de un output antes de emitirlo,
 *   para saber cuánto contexto voy a pagar.
 *
 * AC (features/tokens.feature):
 *   AC-1 estimateTokens(text) → estimación (aprox 4 chars/token).
 *   AC-2 texto vacío → 0.
 *   AC-3 determinista.
 */

/** rol: estima los tokens de un texto (AC-1/2/3). */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}
