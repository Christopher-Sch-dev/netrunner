# Gherkin — depth (disclosure por niveles) (src/depth/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** consultar un símbolo por NIVELES de profundidad (L0→L3),
**para** pagar tokens solo por la profundidad que necesito (los "floors" de la NET
Architecture, mina cyberpunk feature #5).

## Acceptance Criteria
- **AC-1**: `depthQuery(symbol, level, projectDir)` devuelve info según el nivel.
- **AC-2**: L0 = solo nombre/kind/file; L1 = + firma; L2 = + callers; L3 = + impact (blast radius).
- **AC-3**: PURE/determinista: nivel inválido → error; símbolo no encontrado → { found: false }.
- **AC-4**: acotado (no quema tokens: cada nivel agrega solo lo suyo).

## Escenarios
```
Feature: depth (disclosure por niveles)

  Scenario: L0 devuelve solo lo básico
    Given un símbolo indexado
    When  depthQuery('login', 0, dir)
    Then  { found: true, name, kind, file } sin callers

  Scenario: L2 agrega callers
    When  depthQuery('login', 2, dir)
    Then  incluye callers

  Scenario: símbolo no encontrado
    Then  { found: false }
```
