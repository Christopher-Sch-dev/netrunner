# Gherkin — Consolidación de Mementos + rejected-buffer (src/auto/consolidate.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** consolidar Memento-Skills duplicadas y recordar las rechazadas,
**para** que la auto-mejora no drifte (memoria amplia sin consolidar causa regresiones,
validador #3 — evita drift).

## Acceptance Criteria
- **AC-1**: `consolidateMementos(mementos)` agrupa Mementos duplicados (mismo símbolo) en uno consolidado.
- **AC-2**: `rememberRejected(rejected, symbol)` agrega un símbolo al buffer de rechazados (memoria negativa).
- **AC-3**: `isRejected(rejected, symbol)` devuelve true si el símbolo fue rechazado antes.
- **AC-4**: PURE/determinista: sin mementos → []; sin rechazados → false.

## Escenarios
```
Feature: Consolidación de Mementos + rejected-buffer

  Scenario: consolida Mementos duplicados
    Given dos Mementos del mismo símbolo
    When  consolidateMementos(mementos)
    Then  devuelve uno consolidado

  Scenario: rejected-buffer recuerda
    When  rememberRejected(rejected, 'login') y isRejected(rejected, 'login')
    Then  true
```
