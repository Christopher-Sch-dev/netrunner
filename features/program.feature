# Gherkin — program.md: el contrato del programa

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que `init` genere un `program.md` con el contrato del programa (qué es, cómo operarlo, qué tools),
**para** que el agente lea el contrato al conectar y sepa exactamente qué puede hacer (el "program" del cyberdeck).

## Acceptance Criteria
- **AC-1**: `writeProgram(projectDir)` genera `program.md` con el contrato.
- **AC-2**: incluye nombre, descripción, comandos, tools.
- **AC-3**: idempotente (re-generar no duplica).
- **AC-4**: `init` lo genera (conectable layer completo).

## Escenarios
```
Feature: program.md (contrato del programa)

  Scenario: genera el contrato
    Given un proyecto
    When  writeProgram
    Then  crea program.md con nombre + comandos + tools

  Scenario: idempotente
    When  writeProgram dos veces
    Then  no duplica
```
