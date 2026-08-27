# Gherkin — Fix Bug A: colisión de IDs en grafo (src/context/graph.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto con Stryker (que crea `.stryker-tmp`),
**quiero** que el grafo indexe cada definición con un ID ÚNICO por archivo,
**para** que las defs reales de `src/` NO sean sobrescritas por copias de `.stryker-tmp`
con el mismo nombre (bug confirmado: demo-hvac reportó 1667 nodes pero el DB solo 510 filas).

## Acceptance Criteria
- **AC-1**: el ID de cada definición incluye el path relativo del archivo
  (`def:<rel_path>:<name>`), no solo `def:<name>`.
- **AC-2**: `.stryker-tmp` se excluye de la indexación (IGNORED_DIRS).
- **AC-3**: dos archivos con la misma función `login` generan DOS nodos distintos.
- **AC-4**: los tests existentes siguen pasando (no romper el contrato).

## Escenarios
```
Feature: Fix colisión de IDs en grafo

  Scenario: dos archivos con la misma función no colisionan
    Given src/a.ts y src/b.ts ambos con "function login()"
    When  indexProject(dir)
    Then  hay DOS nodos def:src/a.ts:login y def:src/b.ts:login

  Scenario: .stryker-tmp no se indexa
    Given un dir .stryker-tmp con un archivo con "function login()"
    When  indexProject(dir)
    Then  NO hay nodos con file que contenga .stryker-tmp
```
