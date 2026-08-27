# Gherkin — map (grafo visual) (src/map/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** exportar el grafo de conocimiento a un formato visual (JSON para D3/mermaid),
**para** que el "cyberspace" del proyecto sea visualizable (la "matrix" de Case,
mina cyberpunk feature #3).

## Acceptance Criteria
- **AC-1**: `exportMap(projectDir)` devuelve { nodes, edges } del grafo (index.db) en formato JSON.
- **AC-2**: cada nodo tiene { id, name, kind, file }; cada edge { from, to, kind }.
- **AC-3**: PURE/determinista: sin index.db → { nodes: [], edges: [] } (no falla).
- **AC-4**: acotado (máx 200 nodos) para no quemar tokens (TOON).

## Escenarios
```
Feature: map (grafo visual)

  Scenario: exporta el grafo a JSON
    Given un proyecto indexado
    When  exportMap(dir)
    Then  devuelve { nodes, edges } con id/name/kind

  Scenario: sin index.db
    Then  { nodes: [], edges: [] } (no falla)
```
