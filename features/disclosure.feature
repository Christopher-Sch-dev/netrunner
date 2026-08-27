# Gherkin — progressive disclosure por framework

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el deck exponga SOLO las tools relevantes al framework del proyecto,
**para** que el agente no pague tokens por tools que no aplican (la visión del Netdeck: RAM finita, cargás solo lo que necesitás).

## Acceptance Criteria
- **AC-1**: `disclosureFor(stack)` → tools relevantes al framework (react→ops.build, node→ops.test, etc.).
- **AC-2**: `disclosureFor` con framework desconocido → tools base (graph/read).
- **AC-3**: el deck expone las tools del framework detectado.
- **AC-4**: determinista.

## Escenarios
```
Feature: progressive disclosure por framework

  Scenario: framework react
    Given stack con framework react
    When  disclosureFor
    Then  incluye ops.build (build de react)

  Scenario: framework desconocido
    Given stack sin framework
    When  disclosureFor
    Then  tools base (graph/read)

  Scenario: deck usa disclosure
    When  deck
    Then  expone las tools del framework
```
