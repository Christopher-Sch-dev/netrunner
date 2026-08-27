/**
 * rol: contrato compartido de los handlers del CLI (W5.F5.2 — router + handlers).
 * Cada handler recibe el contexto de ejecución (DI, Mandamiento 2) y delega en
 * emit/fail del router. NO importa nada de cli.ts en runtime (solo el tipo).
 */

/** rol: contexto que el router inyecta a cada handler de comando. */
export interface HandlerContext {
  projectDir: string
  args: string[]
  flags: Record<string, string>
  human: boolean
  subcommand: string
  /** rol: imprime JSON estable a stdout (agent) o texto plano (--human). */
  emit: (data: unknown, human: boolean, tool?: string) => void
  /** rol: imprime error estructurado a stderr y sale con exit code. */
  fail: (code: string, message: string, suggestion: string, exitCode?: number) => never
}
