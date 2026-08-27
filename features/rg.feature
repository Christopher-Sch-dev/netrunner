# Gherkin — Conector ripgrep (src/tools/rg.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** buscar texto/patrones en el proyecto con ripgrep (determinista, rápido),
**para** encontrar usos/referencias sin leer archivos masivamente, como una tool
del contrato que cualquier vista (MCP/CLI/Plugin) proyecta.

## Acceptance Criteria
- **AC-1**: `rgSearch(pattern, projectDir)` ejecuta `rg --json` y devuelve matches
  tipados (file, line, column, text). Determinista, sin regex propio.
- **AC-2**: respeta `.gitignore`/ignore files de ripgrep (no indexa node_modules).
- **AC-3**: es una ToolSpec del contrato (`search.rg`, family `read`, readOnly)
  registrada en `graphAndStackTools()` — aparece sola en MCP/CLI.
- **AC-4**: acota el output (límite de matches) para no quemar tokens (TOON).

## Escenarios
```
Feature: Conector ripgrep

  Scenario: busca un patrón en el proyecto y devuelve matches tipados
    Given un proyecto con un archivo que contiene "login"
    When  ejecuto rgSearch("login", dir)
    Then  devuelvo matches con file/line/text de los hits

  Scenario: respeta .gitignore (no busca en node_modules)
    Given node_modules con un archivo que contiene "login"
    Then  los matches NO incluyen node_modules

  Scenario: es ToolSpec del contrato
    Then  buildNetrunnerRegistry().discover() incluye "search.rg"
```
