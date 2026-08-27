# Gherkin — netrunner install (src/install.ts)

## SPEC (Mandamiento 0)
**Como** un agente (o humano) que quiere que un proyecto use Netrunner,
**quiero** ejecutar `netrunner install --target <agente>`,
**para** que el motor quede instalado en el proyecto y el agente lo entienda (SKILL.md) y controle (MCP).

## Acceptance Criteria (DEC-006)
- **AC-1**: escribe `.netrunner/skills/netrunner/SKILL.md` (formato Agent Skills: YAML frontmatter
  name/description + body con cómo operar el motor).
- **AC-2**: registra el binario como MCP server en la config del target:
  `opencode` → `opencode.json`, `claude` → `.claude/settings.json`, `cursor` → `.cursor/mcp.json`,
  `mcp` → `.mcp.json` (default).
- **AC-3**: idempotente (re-ejecutar no duplica; actualiza en-place).
- **AC-4**: devuelve JSON con qué escribió (TOON) + exit 0.
- **AC-5**: target inválido → error estructurado exit 2.

## Escenarios
```
Feature: netrunner install

  Scenario: instala la skill + wiring MCP default
    Given un proyecto
    When  ejecuto install("mcp", dir)
    Then  escribo .netrunner/skills/netrunner/SKILL.md (frontmatter name/description)
    And   escribo .mcp.json con netrunner --mcp

  Scenario: idempotente
    When  ejecuto install dos veces
    Then  no duplica, actualiza en-place, exit 0

  Scenario: target inválido → exit 2
    When  ejecuto install("nope")
    Then  error estructurado MISSING/UNKNOWN
```
