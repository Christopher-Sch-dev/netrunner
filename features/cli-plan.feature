# Gherkin — CLI plan real + TOON (src/cli.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que `netrunner plan "<goal>"` genere un PLAN REAL accionable a partir
del contexto del proyecto (stack + grafo de conocimiento), y que el output sea
**token-optimizado (TOON)** — solo los campos necesarios para el agente, sin
verbosidad humana,
**para** que el agente ejecute el goal en pocas llamadas sin quemar contexto.

## Acceptance Criteria
- **AC-1**: `plan` NO es un placeholder: deriva un plan de pasos accionables del goal +
  contexto (símbolos/archivos relevantes del grafo, stack detectado).
- **AC-2**: el plan tiene `steps[]` con pasos secuenciales, cada uno con acción y
  target concreto (símbolo/archivo).
- **AC-3**: output TOON por defecto (JSON mínimo, sin campo `context` duplicado
  verboso); `--human` da el plan legible con detalle.
- **AC-4**: exit 0 con plan válido; exit 2 si falta el goal (error estructurado).

## Escenarios
```
Feature: CLI plan real y TOON

  Scenario: plan genera pasos desde el contexto del proyecto
    Given un proyecto TS con símbolos indexados
    When  ejecuto "netrunner plan 'hacer X'"
    Then  devuelvo JSON con goal, steps[] y contexto relevante
    And   cada step tiene un action y target concreto

  Scenario: plan sin goal → error estructurado exit 2
    When  ejecuto "netrunner plan" sin goal
    Then  devuelvo error {error:true, code:'MISSING_REQUIRED'} a stderr y exit 2

  Scenario: output TOON por defecto, --human con detalle
    Then  default JSON es token-optimizado (sin campo context verboso)
    And   con --human incluye contexto detallado
```
