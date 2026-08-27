import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dirsTree } from '../src/context/dirs'
import { todosInfo } from '../src/context/todos'

// rol: tests de los detectores dirs + todos (AC-1..4 de features/dirs-todos.feature).

describe('detectores dirs + todos', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-dirs-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('dirsTree: devuelve el árbol de carpetas (AC-1/3)', () => {
    mkdirSync(join(dir, 'src', 'lib'), { recursive: true })
    mkdirSync(join(dir, 'tests'), { recursive: true })

    const tree = dirsTree(dir)

    expect(tree).toContain('src')
    expect(tree).toContain('src/lib')
    expect(tree).toContain('tests')
  })

  it('dirsTree: excluye node_modules y .git (AC-1)', () => {
    mkdirSync(join(dir, 'node_modules', 'dep'), { recursive: true })
    mkdirSync(join(dir, '.git'), { recursive: true })

    const tree = dirsTree(dir)

    expect(tree).not.toContain('node_modules')
    expect(tree).not.toContain('.git')
  })

  it('todosInfo: detecta TODO/FIXME en código (AC-2/4)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), '// TODO: fix this\n// FIXME: refactor\n')

    const info = todosInfo(dir)

    expect(info.todos.length).toBeGreaterThan(0)
    const todo = info.todos.find((t) => t.tag === 'TODO')
    expect(todo).toBeDefined()
    expect(todo!.text).toContain('fix this')
  })

  it('todosInfo: sin TODOs → [] (AC-3, no falla)', () => {
    const info = todosInfo(dir)
    expect(info.todos).toEqual([])
  })
})
