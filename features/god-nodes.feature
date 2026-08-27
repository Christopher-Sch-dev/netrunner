# Gherkin — god nodes: nodos más conectados del grafo

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** detectar los god nodes (nodos más conectados) del grafo,
**para** entender la arquitectura del proyecto (qué módulos son el centro, gap Graphify: god nodes / comunidades).

## Acceptance Criteria
- **AC-1**: `godNodes(projectDir)` → lista de nodos ordenados por grado (más conectados primero).
- **AC-2**: incluye el grado (número de conexiones) de cada nodo.
- **AC-3**: sin grafo → [] (no falla).
- **AC-4**: determinista.

## Escenarios
```
Feature: god nodes (nodos más conectados)

  Scenario: grafo con nodos
    Given un grafo con nodos conectados
    When  godNodes
    Then  devuelve los más conectados primero (con grado)

  Scenario: sin grafo
    Given un proyecto sin grafo
    When  godNodes
    Then  []
```
