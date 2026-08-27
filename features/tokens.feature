# Gherkin — token-counting: estimar tokens del output

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** estimar los tokens de un output antes de emitirlo,
**para** que el agente sepa cuánto contexto va a pagar (la visión del Netdeck: RAM finita, no quemar tokens).

## Acceptance Criteria
- **AC-1**: `estimateTokens(text)` → estimación de tokens (aprox 4 chars/token).
- **AC-2**: `estimateTokens` con texto vacío → 0.
- **AC-3**: determinista.

## Escenarios
```
Feature: token-counting

  Scenario: texto normal
    Given un texto de ~100 chars
    When  estimateTokens
    Then  devuelve ~25 tokens

  Scenario: texto vacío
    Given ""
    When  estimateTokens
    Then  0
```
