# Gherkin — Detectores dirs + todos (src/context/dirs.ts, src/context/todos.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** conocer la estructura de carpetas (árbol) y los pendientes (TODO/FIXME),
**para** que la skill auto-generante documente el árbol del proyecto y los pendientes
(la feature de Cris: "carpetas, subcarpetas" + "pendientes").

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `dirsTree(projectDir)` devuelve el árbol de directorios (hasta depth 3, excluye node_modules/.git).
- **AC-2**: `todosInfo(projectDir)` devuelve { todos: Array<{ file, line, tag, text }> }.
- **AC-3**: PURE/determinista: sin dirs → []; sin TODOs → [] (no falla).
- **AC-4**: TODOs detecta TODO/FIXME en comentarios de código fuente.

## Escenarios
```
Feature: Detectores dirs + todos

  Scenario: árbol de carpetas
    Given src/ y src/lib/
    When  dirsTree(dir)
    Then  incluye 'src' y 'src/lib'

  Scenario: TODOs en código
    Given un archivo con "// TODO: fix this"
    When  todosInfo(dir)
    Then  incluye { tag: 'TODO', text: 'fix this' }
```
