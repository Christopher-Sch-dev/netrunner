# Gherkin — jack-remote: conectar a un repo GitHub remoto

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que `jack <owner/repo>` clone un repo GitHub remoto y lo conecte al deck,
**para** que NetRunner conecte a CUALQUIER proyecto (no solo directorios locales) — la universalidad total.

## Acceptance Criteria
- **AC-1**: `jackRemote(owner, repo, destDir)` clona el repo y corre initProject.
- **AC-2**: devuelve { cloned, dir, counts } (qué se conectó).
- **AC-3**: sin auth git → usa HTTPS público (repos públicos).
- **AC-4**: supply-chain guard: verifica que el repo existe antes de clonar (no clonar URLs arbitrarias).

## Escenarios
```
Feature: jack-remote (conectar repo GitHub)

  Scenario: repo público
    Given un owner/repo público
    When  jackRemote
    Then  clona + init + devuelve counts

  Scenario: repo inexistente
    Given un owner/repo que no existe
    When  jackRemote
    Then  error (no clonar)
```
