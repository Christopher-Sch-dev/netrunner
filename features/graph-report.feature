# Gherkin — graph-report: dashboard humano del grafo

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** generar un reporte markdown del grafo (god nodes, conexiones, resumen),
**para** que el humano vea el "dashboard" del proyecto (gap Graphify: GRAPH_REPORT.md).

## Acceptance Criteria
- **AC-1**: `graphReport(projectDir)` → markdown con god nodes + resumen del grafo.
- **AC-2**: incluye el número de nodos/edges.
- **AC-3**: sin grafo → reporte vacío (no falla).
- **AC-4**: determinista.

## Escenarios
```
Feature: graph-report (dashboard humano)

  Scenario: grafo con nodos
    Given un grafo indexado
    When  graphReport
    Then  markdown con god nodes + resumen

  Scenario: sin grafo
    Given un proyecto sin grafo
    When  graphReport
    Then  reporte vacío (no falla)
```
