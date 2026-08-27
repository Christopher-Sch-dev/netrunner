# Gherkin — Generador de doc viva (src/generate/index.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el motor genere/actualice la documentación del proyecto (README/AGENTS)
desde el snapshot vivo,
**para** que la skill auto-generante documente todo al día (la feature de Cris:
"forzar la creación de documentación del proyecto, con el agente y automáticamente").

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `generateDocs(projectDir)` genera `README.generated.md` y `AGENTS.md` desde el snapshot.
- **AC-2**: el README incluye stack, git (rama/remoto), versiones, cobertura, servicios, pendientes.
- **AC-3**: PURE/determinista: sin snapshot → genera con defaults (no falla).
- **AC-4**: idempotente: re-generar no duplica (sobreescribe).

## Escenarios
```
Feature: Generador de doc viva

  Scenario: genera README desde el snapshot
    Given un proyecto con git + package.json
    When  generateDocs(dir)
    Then  escribe README.generated.md con branch y versiones

  Scenario: idempotente
    When  genero dos veces
    Then  no duplica (sobreescribe)
```
