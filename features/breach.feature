# Gherkin — breach: descifrar un repo desconocido

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que `breach` descifre un repo desconocido en una secuencia determinista (framework→ramas→servicios→exponer deck),
**para** que el netrunner entienda la NET del proyecto antes de operar (Breach Protocol, mina #9).

## Acceptance Criteria
- **AC-1**: `breach(projectDir)` → { stack, git, services, snapshot } (orquesta los detectores).
- **AC-2**: detecta el framework/stack del proyecto.
- **AC-3**: detecta ramas git + remoto.
- **AC-4**: detecta servicios de infraestructura.
- **AC-5**: devuelve un resumen accionable para el agente (qué puede operar).

## Escenarios
```
Feature: breach (descifrar repo)

  Scenario: repo con stack + git + servicios
    Given un proyecto con package.json + git + servicios
    When  breach
    Then  devuelve stack + git + services + resumen accionable

  Scenario: repo sin git
    Given un proyecto sin git
    When  breach
    Then  git es null (no falla)
```
