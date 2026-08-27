/**
 * rol: Import extraction from a file with tree-sitter (AC-G2).
 * Separated from parse.ts to comply with Mandamiento 1 (modules <200 lines, <30 per function).
 * Each language (ts/js/python/go/rust) delegates to its own extractor.
 */
import type { SyntaxNode } from 'web-tree-sitter'
import { forEachNode } from './parse-specs'
import type { ParsedImport } from './parse-specs'

/** rol: extracts the source module of an import node (string without quotes). */
function sourceOf(node: SyntaxNode): string {
  const str = node.namedChildren.find((c) => c.type === 'string')
  if (!str) return ''
  const frag = str.namedChildren.find((c) => c.type === 'string_fragment')
  return frag ? frag.text : str.text.replace(/^['\"]|['\"]$/g, '')
}

/** rol: extracts imports from a TS/JS/TSX import_statement node (import_clause). */
function importsFromJsLike(node: SyntaxNode): ParsedImport[] {
  const source = sourceOf(node)
  const names = new Set<string>()
  const clause = node.namedChildren.find((c) => c.type === 'import_clause')
  if (clause) forEachNode(clause, (c) => { if (c.type === 'identifier') names.add(c.text) })
  return [...names].map((name) => ({ name, source }))
}

/** rol: extracts imports from a Python import_statement / import_from_statement node. */
function importsFromPython(node: SyntaxNode): ParsedImport[] {
  const rel = node.namedChildren.find((c) => c.type === 'relative_import')
  const dottedNames = node.namedChildren.filter((c) => c.type === 'dotted_name')
  const relMod = rel?.namedChildren.find((c) => c.type === 'dotted_name')
  const source = relMod ? relMod.text : dottedNames[0]?.text ?? ''
  const imported = rel ? dottedNames : dottedNames.slice(1)
  const out = imported.map((dn) => ({ name: dn.text, source }))
  if (node.type === 'import_statement') {
    out.push({ name: source, source })
  } else {
    for (const c of node.namedChildren) {
      if (c.type === 'identifier') out.push({ name: c.text, source })
    }
  }
  return out
}

/** rol: extracts imports from a Go import_declaration node. */
function importsFromGo(node: SyntaxNode): ParsedImport[] {
  const out: ParsedImport[] = []
  for (const spec of node.namedChildren.filter((c) => c.type === 'import_spec')) {
    const lit = spec.namedChildren.find((c) => c.type === 'interpreted_string_literal')
    const source = lit ? lit.text.replace(/^\"|\"$/g, '') : ''
    const alias = spec.namedChildren.find((c) => c.type === 'identifier')
    const name = alias ? alias.text : source.split('/').pop() ?? source
    if (source) out.push({ name, source })
  }
  return out
}

/** rol: extracts imports from a Rust use_declaration node. */
function importsFromRust(node: SyntaxNode): ParsedImport[] {
  const path = node.namedChildren.find((c) => c.type === 'scoped_identifier' || c.type === 'identifier')
  if (!path) return []
  const source = path.text
  const name = source.split('::').pop() ?? source
  return [{ name, source }]
}

/** rol: extracts all imports of a file given its tree (AC-G2), by language. */
export function parseImportsFromTree(root: SyntaxNode, language: string, importTypes: string[]): ParsedImport[] {
  const out: ParsedImport[] = []
  forEachNode(root, (n) => {
    if (!importTypes.includes(n.type)) return
    const byLang: Record<string, (n: SyntaxNode) => ParsedImport[]> = {
      typescript: importsFromJsLike,
      javascript: importsFromJsLike,
      tsx: importsFromJsLike,
      python: importsFromPython,
      go: importsFromGo,
      rust: importsFromRust,
    }
    const extractor = byLang[language]
    if (extractor) out.push(...extractor(n))
  })
  return out
}
