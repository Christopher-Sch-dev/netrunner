import { describe, it, expect } from 'vitest'
import { parseFile, parseDefinitions, parseImports, parseCalls } from '../src/context/parse'

describe('parse (tree-sitter WASM)', () => {
  it('TS: defs + imports + calls', async () => {
    const f = await parseFile(
      `import { foo } from './dep'
function login(name: string) { return authenticate(foo()) }
export const MAX = 10
export class User {}`,
      'typescript',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['function:login', 'const:MAX', 'class:User'])
    expect(f.imports).toContainEqual({ name: 'foo', source: './dep' })
    expect(f.calls).toContainEqual({ caller: 'login', callee: 'authenticate' })
    expect(f.calls).toContainEqual({ caller: 'login', callee: 'foo' })
  })

  it('python: defs + import_from + call', async () => {
    const f = await parseFile(
      `from .dep import helper
def login():
    return authenticate(helper())`,
      'python',
    )
    expect(f.defs).toEqual([{ name: 'login', kind: 'function', line: 2, endLine: 3 }])
    expect(f.imports).toContainEqual({ name: 'helper', source: 'dep' })
    expect(f.calls).toContainEqual({ caller: 'login', callee: 'authenticate' })
  })

  it('go: defs + const + type + call', async () => {
    const f = await parseFile(
      `package main
func login() string { return authenticate() }
const MAX = 10
type User struct { Name string }`,
      'go',
    )
    expect(f.defs).toEqual([
      { name: 'login', kind: 'function', line: 2, endLine: 2 },
      { name: 'MAX', kind: 'const', line: 3, endLine: 3 },
      { name: 'User', kind: 'type', line: 4, endLine: 4 },
    ])
    expect(f.calls).toContainEqual({ caller: 'login', callee: 'authenticate' })
  })

  it('rust: defs + use + call', async () => {
    const f = await parseFile(
      `use crate::auth::authenticate;
pub fn login() -> String { authenticate() }
pub struct User { name: String }
pub const MAX: u32 = 10;`,
      'rust',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['function:login', 'class:User', 'const:MAX'])
    expect(f.imports).toContainEqual({ name: 'authenticate', source: 'crate::auth::authenticate' })
    expect(f.calls).toContainEqual({ caller: 'login', callee: 'authenticate' })
  })

  it('rust: call con scoped_identifier (foo::bar) genera edge (P3.1)', async () => {
    const f = await parseFile(
      `mod utils;
pub fn run() -> String { utils::helper() }`,
      'rust',
    )
    expect(f.calls).toContainEqual({ caller: 'run', callee: 'utils::helper' })
  })

  it('unsupported language returns empty', async () => {
    const f = await parseFile('x', 'cobol')
    expect(f).toEqual({ defs: [], imports: [], calls: [] })
  })
})
