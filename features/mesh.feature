# Gherkin — net mesh (grafo multi-repo) (src/mesh/index.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** conectar N proyectos en un grafo multi-repo,
**para** que el daemon pase de "jack a un sistema" a "jack a la red" (Jueces 1,3 —
Puppet Master, mina cyberpunk #13).

## Acceptance Criteria
- **AC-1**: `meshProjects(dirs)` indexa cada proyecto y devuelve { projects, totalNodes }.
- **AC-2**: detecta dependencias entre proyectos (mismo nombre de módulo en 2 repos).
- **AC-3**: PURE/determinista: sin dirs → { projects: [], totalNodes: 0 }.
- **AC-4**: idempotente (re-correr no duplica).

## Escenarios
```
Feature: net mesh

  Scenario: conecta N proyectos
    Given dos proyectos
    When  meshProjects([dir1, dir2])
    Then  devuelve { projects: 2, totalNodes: N }

  Scenario: sin dirs → vacío
    Then  { projects: [], totalNodes: 0 }
```
