/**
 * rol: Contrato de tools de Netrunner — el núcleo PURE del motor.
 *
 * Un solo contrato (ToolSpec + ToolContext + ToolHandler) del que se
 * proyectan las 4 vistas: MCP server, harness-adapter, Agent Plugin, CLI/AXI.
 * (DEC-001, DEC-002 — un binario = un contrato, múltiples vistas.)
 *
 * Reglas:
 * - PURE: sin I/O. Los handlers reciben todo por ToolContext (DI, Mandamiento 2).
 * - Cada tool declara `readOnly` para la separación read vs mutate (AC-6).
 * - `capabilities` permite el determinismo por contexto/objetivo (AC-9).
 */
export interface ToolSpec {
  /** id único de la tool (ej. "graph.explore", "op.test"). */
  id: string
  /** descripción para el LLM: qué hace y cuándo usarla (patrón AI SDK v7). */
  description: string
  /** familia para progressive disclosure / filtrado por objetivo. */
  family: 'read' | 'graph' | 'op' | 'config' | 'build' | 'test'
  /** true si la tool NO muta el proyecto (solo lee o ejecuta sin tocar fuente). */
  readOnly: boolean
  /** capabilities que activan esta tool (determinismo por contexto, AC-9). */
  capabilities: string[]
  /** esquema de entrada (JSON Schema versionado — versionado de contrato). */
  inputSchema: Record<string, unknown>
  /** ejecuta la tool. Recibe el contexto por parámetro (DI, nunca global). */
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}

/**
 * Contexto inyectado a cada tool. Solo contiene lo que ESA tool necesita
 * (toolsContext de AI SDK v7) — nunca secrets de más (Mandamiento 7).
 */
export interface ToolContext {
  /** directorio raíz del proyecto operado. */
  projectDir: string
  /** secrets scopeados solo a esta tool (nunca al LLM). */
  secrets: Record<string, string>
  /** perfil de objetivo activo: explore | edit | ops | review (AC-9). */
  profile: string
  /** idempotencyKey: re-ejecución devuelve resultado cacheado (Mandamiento 8). */
  idempotencyKey?: string
}

/**
 * Registry del contrato: registrar / descubrir / ejecutar tools.
 * Es la interfaz única de la que las 4 vistas leen (sin duplicar handlers).
 */
export class ToolRegistry {
  private tools = new Map<string, ToolSpec>()

  /** registra una tool. Lanza si el id ya existe (idempotencia de registro). */
  register(spec: ToolSpec): void {
    if (this.tools.has(spec.id)) {
      throw new Error(`Tool already registered: ${spec.id}`)
    }
    this.tools.set(spec.id, spec)
  }

  /** descubre tools filtradas por capability + perfil (determinismo AC-9). */
  discover(profile: string): ToolSpec[] {
    return [...this.tools.values()].filter((t) => t.capabilities.includes(profile))
  }

  /** ejecuta una tool por id, con contexto (DI). Devuelve el resultado. */
  async call(id: string, input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(id)
    if (!tool) throw new Error(`Unknown tool: ${id}`)
    return tool.execute(input, ctx)
  }

  /** lista todos los ids registrados (para vistas MCP/plugin/CLI). */
  listIds(): string[] {
    return [...this.tools.keys()]
  }
}
