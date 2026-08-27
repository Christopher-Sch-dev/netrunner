# Gherkin — persist (decisiones durables) (src/persist/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** dejar una DECISIÓN durable con provenance (quién/qué/cuándo) que sobreviva
a la sesión,
**para** que la próxima sesión la retome (el "virus que persiste tras Jack-Out" de la
mina cyberpunk, feature #7).

## Acceptance Criteria
- **AC-1**: `persistDecision(projectDir, decision)` escribe una decisión en `.netrunner/decisions/<slug>.md` con provenance.
- **AC-2**: el archivo incluye: fecha, autor (agente), decisión, contexto, estado (open/done).
- **AC-3**: PURE/determinista: slug derivado del texto (no colisiona).
- **AC-4**: idempotente: misma decisión → mismo slug (sobreescribe, no duplica).

## Escenarios
```
Feature: persist (decisiones durables)

  Scenario: persiste una decisión con provenance
    Given un proyecto
    When  persistDecision(dir, 'usar plugin system')
    Then  escribe .netrunner/decisions/usar-plugin-system.md con fecha y autor

  Scenario: idempotente
    When  persisto la misma decisión dos veces
    Then  mismo slug (sobreescribe, no duplica)
```
