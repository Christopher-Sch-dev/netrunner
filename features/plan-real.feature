# Gherkin — plan real basado en el grafo

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que `plan "<goal>"` genere pasos accionables DERIVADOS del grafo y del goal,
**para** que el plan no sea un stub genérico (explore+verify) sino una guía real de implementación (el defecto más grave para un LLM, fix juez).

## Acceptance Criteria
- **AC-1**: `generatePlan(goal, dir)` analiza el goal y busca símbolos relevantes en el grafo.
- **AC-2**: los pasos incluyen explore del símbolo + callers/callees (blast radius) + operar (test/build).
- **AC-3**: si el goal menciona un símbolo existente, el plan lo usa (no genérico).
- **AC-4**: determinista (mismo goal → mismo plan).

## Escenarios
```
Feature: plan real basado en el grafo

  Scenario: goal menciona un símbolo existente
    Given un proyecto con el símbolo 'login' indexado
    When  plan "agregar validación a login"
    Then  el plan incluye explore login + callers de login

  Scenario: goal genérico
    Given un proyecto indexado
    When  plan "arreglar un bug"
    Then  el plan incluye pasos accionables del grafo (no solo explore+verify)
```
