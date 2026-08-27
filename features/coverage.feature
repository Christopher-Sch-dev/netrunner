# Gherkin — Detector de cobertura de tests (src/context/coverage.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** conocer el % de cobertura de tests del proyecto,
**para** que la skill auto-generante documente qué porcentaje del proyecto está
cubierto por tests (la feature de Cris: "qué porcentaje del proyecto completo
y los tests rellenados o actuales").

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `coverageInfo(projectDir)` devuelve { lines, functions, branches, statements } (%).
- **AC-2**: lee `coverage/coverage-summary.json` (formato vitest/istanbul json-summary).
- **AC-3**: PURE/determinista: si no hay coverage → { lines: 0, ... } (no falla).
- **AC-4**: los % son números (0-100), no strings.

## Escenarios
```
Feature: Detector de cobertura

  Scenario: coverage-summary.json existe
    Given coverage/coverage-summary.json con total.lines.pct = 85
    When  coverageInfo(dir)
    Then  lines = 85

  Scenario: sin coverage
    Then  { lines: 0, functions: 0, branches: 0, statements: 0 } (no falla)
```
