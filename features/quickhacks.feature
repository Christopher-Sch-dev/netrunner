# Gherkin — quickhacks con costo/cooldown

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que los quickhacks (ops) tengan costo (tokens/tiempo) y cooldown,
**para** que el agente no queme recursos en operaciones repetidas (mina #8: micro-tools con RAM/costo y throttling).

## Acceptance Criteria
- **AC-1**: `quickhackCost(kind)` → costo estimado (tokens/tiempo) de cada op.
- **AC-2**: `cooldownCheck(lastRun, cooldownMs)` → true si está en cooldown.
- **AC-3**: `quickhacks` lista los quickhacks con su costo + cooldown.
- **AC-4**: determinista.

## Escenarios
```
Feature: quickhacks con costo/cooldown

  Scenario: costo por op
    Given un quickhack 'test'
    When  quickhackCost
    Then  devuelve costo estimado

  Scenario: cooldown activo
    Given una op que corrió hace 1s con cooldown 5s
    When  cooldownCheck
    Then  true (en cooldown)

  Scenario: cooldown expirado
    Given una op que corrió hace 10s con cooldown 5s
    When  cooldownCheck
    Then  false (listo)
```
