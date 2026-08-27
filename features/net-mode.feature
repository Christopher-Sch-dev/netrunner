# Gherkin — net mode: el modo del deck

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el deck tenga un modo (explore/operate/audit) que cambia el perfil de tools expuestas,
**para** que el agente cargue solo el perfil que necesita (Wintermute/Neuromancer: el deck se adapta al objetivo).

## Acceptance Criteria
- **AC-1**: `netMode(profile)` → tools del perfil (explore→graph/read, operate→ops, audit→guard/policy).
- **AC-2**: perfil desconocido → explore (default).
- **AC-3**: determinista.

## Escenarios
```
Feature: net mode

  Scenario: perfil explore
    Given profile 'explore'
    When  netMode
    Then  tools graph/read

  Scenario: perfil operate
    Given profile 'operate'
    When  netMode
    Then  tools ops

  Scenario: perfil audit
    Given profile 'audit'
    When  netMode
    Then  tools guard/policy

  Scenario: perfil desconocido
    Given profile 'xyz'
    When  netMode
    Then  explore (default)
```
