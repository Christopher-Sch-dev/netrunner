# Gherkin — naming cyberpunk: aliases + estado del deck

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el CLI hable el lenguaje del cyberdeck (jack/quickhacks/ice) y que `deck` muestre el estado del deck,
**para** que el agente y el usuario SIENTAN que esto es un cyberdeck de Night City, no otro CLI de DevOps (la "forma de contar", fix auditor de visión).

## Acceptance Criteria
- **AC-1**: aliases cyberpunk: `jack`=init, `quickhacks`=ops, `ice`=guard.
- **AC-2**: `deck` muestra el estado del deck: quickhacks disponibles, daemons activos, canon pendiente.
- **AC-3**: los aliases devuelven el mismo output que el comando original.
- **AC-4**: determinista.

## Escenarios
```
Feature: naming cyberpunk

  Scenario: jack = init
    Given un proyecto
    When  jack
    Then  indexa + genera conectable layer (igual que init)

  Scenario: quickhacks = ops
    When  quickhacks test
    Then  corre el test (igual que ops test)

  Scenario: ice = guard
    When  ice
    Then  detecta secrets/imports rotos (igual que guard)

  Scenario: deck muestra el estado
    When  deck
    Then  quickhacks + daemons + canon pendiente
```
