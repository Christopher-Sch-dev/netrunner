/**
 * rol: Extracción pura de símbolos/definiciones de código fuente con tree-sitter (WASM).
 * Sin I/O ni persistencia: parsea un string y devuelve estructuras planas que graph.ts
 * convierte en GraphNode/GraphEdge y persiste. Gramáticas: typescript/tsx/javascript,
 * python, go, rust (gramáticas WASM de tree-sitter-wasms, cargadas vía web-tree-sitter).
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

/** Símbolo plano extraído de una definición (sin id ni file: se asignan en graph.ts). */
export interface ParsedSymbol {
  name: string
  kind: string
  line: number
  endLine: number
}

/** Import plano: nombre importado + módulo fuente. */
export interface ParsedImport {
  name: string
  source: string
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

/** Nombre del archivo WASM de cada gramática soportada. */
const WASM_FILES: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  python: 'tree-sitter-python.wasm',
  go: 'tree-sitter-go.wasm',
  rust: 'tree-sitter-rust.wasm',
}

/** Configuración por lenguaje: qué nodos son definiciones y cómo se llama al nombre. */
const SPECS: Record<string, { defs: Record<string, string>; names: string[]; importTypes: string[] }> = {
  typescript: {
    defs: {
      function_declaration: 'function',
      method_definition: 'function',
      generator_function: 'function',
      class_declaration: 'class',
      interface_declaration: 'type',
      type_alias_declaration: 'type',
      variable_declarator: 'const',
    },
    names: ['identifier', 'type_identifier'],
    importTypes: ['import_statement'],
  },
  javascript: {
    defs: {
      function_declaration: 'function',
      method_definition: 'function',
      generator_function: 'function',
      class_declaration: 'class',
      variable_declarator: 'const',
    },
    names: ['identifier'],
    importTypes: ['import_statement'],
  },
  python: {
    defs: {
      function_definition: 'function',
      class_definition: 'class',
    },
    names: ['identifier'],
    importTypes: ['import_statement', 'import_from_statement'],
  },
  go: {
    defs: {
      function_declaration: 'function',
      method_declaration: 'function',
      type_spec: 'type',
      const_spec: 'const',
    },
    names: ['identifier', 'type_identifier'],
    importTypes: ['import_declaration'],
  },
  rust: {
    defs: {
      function_item: 'function',
      struct_item: 'class',
      enum_item: 'type',
      type_item: 'type',
      const_item: 'const',
    },
    names: ['identifier', 'type_identifier'],
    importTypes: ['use_declaration'],
  },
}

/** Tipos de nodo que abren un contexto de función (para resolver el caller de una llamada). */
const FUNC_TYPES = new Set([
  'function_declaration',
  'method_definition',
  'generator_function',
  'arrow_function',
  'function_definition',
  'class_definition',
  'function_item',
  'method_declaration',
  'func_literal',
  'impl_item',
  'trait_item',
])

/** Tipos de nodo que representan una llamada a función. */
const CALL_TYPES = new Set(['call_expression', 'call'])

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

/** rol: recorre cada nodo del árbol aplicando fn (incluye el propio root). */
function forEachNode(node: SyntaxNode, fn: (n: SyntaxNode) => void): void {
  fn(node)
  for (const child of node.namedChildren) forEachNode(child, fn)
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

/** rol: extrae el módulo fuente de un nodo import (string sin comillas). */
function sourceOf(node: SyntaxNode): string {
  const str = node.namedChildren.find((c) => c.type === 'string')
  if (!str) return ''
  const frag = str.namedChildren.find((c) => c.type === 'string_fragment')
  return frag ? frag.text : str.text.replace(/^['"]|['"]$/g, '')
}

/** rol: extrae imports de un archivo (AC-G2). */
export async function parseImports(code: string, language: string): Promise<ParsedImport[]> {
  const tree = await parse(code, language)
  if (!tree) return []
  const spec = SPECS[language]
  const out: ParsedImport[] = []
  forEachNode(tree.rootNode, (n) => {
    if (!spec.importTypes.includes(n.type)) return
    if (language === 'typescript' || language === 'javascript' || language === 'tsx') {
      const source = sourceOf(n)
      const names = new Set<string>()
      const clause = n.namedChildren.find((c) => c.type === 'import_clause')
      if (clause) {
        forEachNode(clause, (c) => {
          if (c.type === 'identifier') names.add(c.text)
        })
      }
      for (const name of names) out.push({ name, source })
    } else if (language === 'python') {
      const rel = n.namedChildren.find((c) => c.type === 'relative_import')
      // módulo = primer dotted_name (o el del relative_import); el resto son símbolos importados
      const dottedNames = n.namedChildren.filter((c) => c.type === 'dotted_name')
      const relMod = rel?.namedChildren.find((c) => c.type === 'dotted_name')
      const source = relMod ? relMod.text : dottedNames[0]?.text ?? ''
      const imported = rel ? dottedNames : dottedNames.slice(1)
      for (const dn of imported) out.push({ name: dn.text, source })
      if (n.type === 'import_statement') {
        out.push({ name: source, source })
      } else {
        // import_from: además los identifiers directos (ej. alias) que no estén en dottedNames
        for (const c of n.namedChildren) {
          if (c.type === 'identifier') out.push({ name: c.text, source })
        }
      }
    } else if (language === 'go') {
      for (const spec of n.namedChildren.filter((c) => c.type === 'import_spec')) {
        const lit = spec.namedChildren.find((c) => c.type === 'interpreted_string_literal')
        const source = lit ? lit.text.replace(/^"|"$/g, '') : ''
        const alias = spec.namedChildren.find((c) => c.type === 'identifier')
        const name = alias ? alias.text : source.split('/').pop() ?? source
        if (source) out.push({ name, source })
      }
    } else if (language === 'rust') {
      const path = n.namedChildren.find((c) => c.type === 'scoped_identifier' || c.type === 'identifier')
      if (path) {
        const source = path.text
        const name = source.split('::').pop() ?? source
        out.push({ name, source })
      }
    }
  })
  return out
}

/** rol: extrae llamadas con su función envolvente (AC-G3). */
export async function parseCalls(code: string, language: string): Promise<ParsedCall[]> {
  const tree = await parse(code, language)
  if (!tree) return []
  const calls: ParsedCall[] = []
  const stack: string[] = []

  const walk = (n: SyntaxNode): void => {
    if (CALL_TYPES.has(n.type)) {
      const callee = firstNamed(n, ['identifier'])
      if (callee) calls.push({ caller: stack[stack.length - 1] ?? null, callee })
    }
    if (FUNC_TYPES.has(n.type)) {
      const name = firstNamed(n, ['identifier', 'type_identifier'])
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
