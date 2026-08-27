# Gherkin — path: shortest-path entre dos símbolos

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** trazar el camino más corto entre dos símbolos del grafo,
**para** entender cómo se conecta X con Y (gap Graphify: `graphify path A B`).

## Acceptance Criteria
- **AC-1**: `shortestPath(projectDir, from, to)` → lista de nodos (BFS sobre el grafo).
- **AC-2**: sin camino → [] (no falla).
- **AC-3**: determinista.
- **AC-4**: reutiliza el grafo indexado (no re-indexa).

## Escenarios
```
Feature: path (shortest-path)

  Scenario: camino existe
    Given un grafo con A → B → C
    When  shortestPath(A, C)
    Then  devuelve [A, B, C]

  Scenario: sin camino
    Given un grafo sin conexión A-C
    When  shortestPath(A, C)
    Then  []
```
