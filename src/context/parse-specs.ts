/**
 * rol: Pure configuration of Netrunner's tree-sitter grammars (no logic).
 * Extracted from parse.ts to comply with Mandamiento 1 (file <200 lines, modular).
 * Specifies which nodes are definitions, how they are named, and which import types
 * exist per language — without parsing anything.
 */
import type { SyntaxNode } from 'web-tree-sitter'

/** Flat import: imported name + source module. */
export interface ParsedImport {
  name: string
  source: string
}

/** rol: walks each node of the tree applying fn (includes the root itself). */
export function forEachNode(node: SyntaxNode, fn: (n: SyntaxNode) => void): void {
  fn(node)
  for (const child of node.namedChildren) forEachNode(child, fn)
}

/** WASM file name of each supported grammar. */
export const WASM_FILES: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  python: 'tree-sitter-python.wasm',
  go: 'tree-sitter-go.wasm',
  rust: 'tree-sitter-rust.wasm',
}
/** Configuración por lenguaje: qué nodos son definiciones y cómo se llama al nombre. */
export const SPECS: Record<string, { defs: Record<string, string>; names: string[]; importTypes: string[] }> = {
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
export const FUNC_TYPES = new Set([
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
export const CALL_TYPES = new Set(['call_expression', 'call'])
