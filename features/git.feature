# Gherkin — Detector git (src/context/git.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** conocer el estado git del proyecto (rama, remoto, commits recientes),
**para** que la skill auto-generante documente en qué rama está, si está conectado
a GitHub, y los últimos cambios (la feature de documentación git).

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `gitInfo(projectDir)` devuelve { branch, remote, remoteUrl, lastCommits }.
- **AC-2**: PURE/determinista: lee `.git/HEAD` y `.git/config` (sin ejecutar git, sin I/O pesada).
- **AC-3**: si no es repo git → devuelve { branch: null, remote: null } (no falla).
- **AC-4**: `lastCommits` lista hasta 5 commits recientes (hash corto + mensaje).

## Escenarios
```
Feature: Detector git

  Scenario: repo git con remoto
    Given un repo git con rama develop y remoto origin
    When  gitInfo(dir)
    Then  branch = 'develop', remote = 'origin', remoteUrl contiene github

  Scenario: no es repo git
    Given un dir sin .git
    Then  branch = null, remote = null (no falla)
```
