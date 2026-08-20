/**
 * rol: Tipos compartidos de la capa de contexto (grafo de conocimiento) de Netrunner.
 * ANCLA de la Wave 1 — NO MODIFICAR sin coordinarse: lo consumen detect.ts, graph.ts y queries.ts.
 * (DEC-001/002/005: núcleo-contrato + slice vertical; versionado de contrato.)
 */

/** Lenguaje/framework detectado de un proyecto (detección por manifestos, determinista). */
export interface StackInfo {
  /** lenguaje principal detectado: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'unknown' | ... */
  language: string
  /** framework/build tool detectado: 'astro' | 'react' | 'next' | 'vite' | 'node' | 'bun' | ... */
  framework: string
  /** gestor de paquetes: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'pip' | 'cargo' | ... */
  packageManager: string
  /** manifiesto que se usó para detectar (ruta relativa, ej. 'package.json'). */
  manifestPath: string
}

/** Nodo del grafo: un símbolo/definición del proyecto. */
export interface GraphNode {
  /** id único dentro del grafo del proyecto (ej. 'def:UserService.login'). */
  id: string
  /** nombre del símbolo. */
  name: string
  /** tipo de definición: 'class' | 'function' | 'const' | 'type' | 'import' | ... */
  kind: string
  /** ruta del archivo (relativa al proyecto). */
  file: string
  /** línea de inicio (1-based). */
  line: number
  /** línea de fin (inclusive). */
  endLine: number
}

/** Edge del grafo: relación entre dos nodos. provenance: EXTRACTED (leído) | INFERRED (derivado). */
export interface GraphEdge {
  /** nodo origen. */
  from: string
  /** nodo destino. */
  to: string
  /** tipo de relación: 'calls' | 'imports' | 'extends' | 'implements' | 'references' | ... */
  kind: string
  /** provenance del edge (patrón Graphify, DEC-005). */
  provenance: 'EXTRACTED' | 'INFERRED'
}

/** Resultado de una query del grafo (AC-5: explore/search/callers/callees/impact). */
export interface QueryResult {
  /** nodos que matchean la query. */
  nodes: GraphNode[]
  /** edges que conectan esos nodos (blast radius). */
  edges: GraphEdge[]
  /** true si se truncó por límite (blast-radius acotado). */
  truncated: boolean
}
