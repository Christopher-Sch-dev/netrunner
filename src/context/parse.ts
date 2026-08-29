/**
 * rol: Extracción pura de símbolos/definiciones de código fuente con tree-sitter (WASM).
 * Sin I/O ni persistencia: parsea un string y devuelve estructuras planas que graph.ts
 * convierte en GraphNode/GraphEdge y persiste. Gramáticas: typescript/tsx/javascript,
 * python, go, rust (gramáticas WASM de tree-sitter-wasms, cargadas vía web-tree-sitter).
 * Config de gramáticas y extractor de imports viven en parse-specs.ts y parse-imports.ts
 * (Mandamiento 1: módulos <200 líneas, <30 por función).
 *
 * SPEC (Mandamiento 0):
 *   Como netrunner, quiero extraer definiciones (class/function/const/type/import),
 *   llamadas y imports de un archivo fuente con un parser real (no regex),
 *   para que graph.ts indexe un grafo de conocimiento fiel al código.
 *
 * AC:
 *   AC-G1 parseDefinitions: extrae class/function/const/type por gramática del lenguaje.
 *   AC-G2 parseImports: extrae nombre + módulo fuente de los imports del archivo.
 *   AC-G3 parseCalls: extrae { caller, callee } de las llamadas, con el contexto de la
 *        función envolvente (para resolver EXTRACTED vs INFERRED en graph.ts).
 *   AC-G4 parseFile: devuelve defs + imports + calls de un archivo en un solo parse.
 *
 * GHERKIN:
 *   GIVEN un código fuente válido en un lenguaje soportado
 *   WHEN  parseo sus definiciones/imports/llamadas
 *   THEN  devuelvo los símbolos planos con nombre/kind/line/endLine y las llamadas
 *         con su función envolvente.
 */
import { createRequire } from 'node:module'
import Parser from 'web-tree-sitter'
import type { SyntaxNode, Tree } from 'web-tree-sitter'
import { WASM_FILES, SPECS, FUNC_TYPES, CALL_TYPES, forEachNode } from './parse-specs'
import type { ParsedImport } from './parse-specs'
import { parseImportsFromTree } from './parse-imports'

/** Símbolo plano extraído de una definición (sin id ni file: se asignan en graph.ts). */
export interface ParsedSymbol {
  name: string
  kind: string
  line: number
  endLine: number
}

/** Llamada plana: callee + caller (función envolvente, o null si es top-level). */
export interface ParsedCall {
  caller: string | null
  callee: string
}

/** Resultado de parseFile: las tres vistas de un archivo. */
export interface ParsedFile {
  defs: ParsedSymbol[]
  imports: ParsedImport[]
  calls: ParsedCall[]
}

export type { ParsedImport }

let initPromise: Promise<void> | null = null

/** rol: inicializa el runtime WASM de web-tree-sitter una sola vez (idempotente). */
function ensureInit(): Promise<void> {
  initPromise ??= Parser.init()
  return initPromise
}

const langCache = new Map<string, Parser.Language>()

/** rol: carga (y cachea) la gramática WASM de un lenguaje, resolviendo su path real. */
async function languageFor(language: string): Promise<Parser.Language> {
  const cached = langCache.get(language)
  if (cached) return cached
  const req = createRequire(import.meta.url)
  const wasmPath = req.resolve(`tree-sitter-wasms/out/${WASM_FILES[language]}`)
  const lang = await Parser.Language.load(wasmPath)
  langCache.set(language, lang)
  return lang
}

/** rol: crea un parser configurado para el lenguaje dado (nuevo en cada llamada). */
async function createParser(language: string): Promise<Parser> {
  await ensureInit()
  const lang = await languageFor(language)
  const parser = new Parser()
  parser.setLanguage(lang)
  return parser
}

/** rol: devuelve el texto del primer hijo cuyo tipo esté en types, o null. */
function firstNamed(node: SyntaxNode, types: string[]): string | null {
  for (const child of node.namedChildren) {
    if (types.includes(child.type)) return child.text
  }
  return null
}

/** rol: parsea un código y devuelve su árbol, o null si el lenguaje no se soporta. */
async function parse(code: string, language: string): Promise<Tree | null> {
  if (!SPECS[language]) return null
  const parser = await createParser(language)
  return parser.parse(code)
}

/** rol: extrae definiciones de un código (AC-G1). */
export async function parseDefinitions(code: string, language: string): Promise<ParsedSymbol[]> {
  const tree = await parse(code, language)
  if (!tree) return []
  const spec = SPECS[language]
  const out: ParsedSymbol[] = []
  forEachNode(tree.rootNode, (n) => {
    const kind = spec.defs[n.type]
    if (!kind) return
    // variable_declarator solo cuenta como const si viene de una lexical_declaration (let/const)
    if (n.type === 'variable_declarator' && n.parent?.type !== 'lexical_declaration') return
    const name = firstNamed(n, spec.names)
    if (!name) return
    out.push({ name, kind, line: n.startPosition.row + 1, endLine: n.endPosition.row + 1 })
  })
  return out
}

/** rol: extrae imports de un archivo (AC-G2), delegando en parse-imports. */
export async function parseImports(code: string, language: string): Promise<ParsedImport[]> {
  const tree = await parse(code, language)
  if (!tree) return []
  const spec = SPECS[language]
  return parseImportsFromTree(tree.rootNode, language, spec.importTypes)
}

/** rol: extrae llamadas con su función envolvente (AC-G3). */
export async function parseCalls(code: string, language: string): Promise<ParsedCall[]> {
  const tree = await parse(code, language)
  if (!tree) return []
  const calls: ParsedCall[] = []
  const stack: string[] = []

  // Wave E2: el callee de PHP es un nodo `name` (no `identifier`); Ruby usa `identifier`.
  // P3.1 (auditor): Rust usa `scoped_identifier` para llamadas con path (ej: `foo::bar()`),
  // no `identifier` — sin esto, las llamadas a funciones de módulos no generan edges.
  const calleeTypes = language === 'php' ? ['name'] : language === 'rust' ? ['identifier', 'scoped_identifier'] : ['identifier']

  const walk = (n: SyntaxNode): void => {
    if (CALL_TYPES.has(n.type)) {
      // Ruby: `require`/`require_relative` son imports, no llamadas (AC-L2).
      if (language === 'ruby' && n.type === 'call') {
        const head = n.namedChildren[0]
        if (head && (head.text === 'require' || head.text === 'require_relative')) return
      }
      const callee = firstNamed(n, calleeTypes)
      if (callee) calls.push({ caller: stack[stack.length - 1] ?? null, callee })
    }
    if (FUNC_TYPES.has(n.type)) {
      // el nombre de función es el `identifier` (no el tipo de retorno `type_identifier`):
      // en Java/C# el tipo de retorno precede al nombre en el orden de hijos.
      const name = firstNamed(n, ['identifier']) ?? firstNamed(n, ['type_identifier', 'constant', 'name'])
      stack.push(name ?? '')
      for (const c of n.namedChildren) walk(c)
      stack.pop()
      return
    }
    for (const c of n.namedChildren) walk(c)
  }

  walk(tree.rootNode)
  return calls
}

/** rol: devuelve defs + imports + calls de un archivo en un solo parse (AC-G4). */
export async function parseFile(code: string, language: string): Promise<ParsedFile> {
  const [defs, imports, calls] = await Promise.all([
    parseDefinitions(code, language),
    parseImports(code, language),
    parseCalls(code, language),
  ])
  return { defs, imports, calls }
}
