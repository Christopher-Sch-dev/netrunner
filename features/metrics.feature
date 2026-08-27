# Gherkin — m4-metrics: p50/p95/p99 sobre los seams

## SPEC (Mandamiento 0 + 4 — observabilidad)
**Como** el motor Netrunner,
**quiero** métricas de latencia (p50/p95/p99) sobre los seams (hooks/events/history),
**para** que el agente vea el rendimiento real de las operaciones (M4 es el eslabón más débil: seams listos, cero métricas).

## Acceptance Criteria
- **AC-1**: `recordLatency(projectDir, tool, ms)` persiste la latencia de una op.
- **AC-2**: `latencyPercentiles(projectDir, tool)` → { p50, p95, p99, count }.
- **AC-3**: `ops` registra su latencia (seam conectado).
- **AC-4**: sin datos → percentiles null (no falla).

## Escenarios
```
Feature: m4-metrics (p50/p95/p99)

  Scenario: registra y calcula percentiles
    Given latencias [10, 20, 30, 40, 100]
    When  latencyPercentiles
    Then  p50=30, p95=100, p99=100

  Scenario: ops registra latencia
    When  ops test
    Then  la latencia queda registrada

  Scenario: sin datos
    Given sin latencias
    When  latencyPercentiles
    Then  null (no falla)
```
