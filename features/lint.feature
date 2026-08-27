# Gherkin — Lint periódico del snapshot (src/auto/lint.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** un health-check del snapshot (stale, contradicciones, orphans),
**para** que la skill auto-generante se auto-mantenga (la idea de Karpathy que el
validador destacó — el lint del LLM Wiki aplicado al proyecto).

## Acceptance Criteria
- **AC-1**: `lintSnapshot(snapshot)` devuelve { issues: [{ type, message }] }.
- **AC-2**: detecta stale (coverage 0 con tests presentes, versiones viejas).
- **AC-3**: detecta orphans (módulos sin referencias en el grafo).
- **AC-4**: PURE/determinista: snapshot sano → { issues: [] }.

## Escenarios
```
Feature: Lint periódico del snapshot

  Scenario: detecta stale (coverage 0 con tests)
    Given un snapshot con coverage 0 y tests presentes
    When  lintSnapshot(snapshot)
    Then  issues incluye un tipo 'stale'

  Scenario: snapshot sano → sin issues
    Then  { issues: [] }
```
