# TESTING — Netrunner — Universal Agent SDK

> Los tests y POR QUÉ existen. Qué validan, qué responden, qué prueban.
> Actualizar cada vez que cambien tests o se agreguen.

## Pipeline obligatorio
1. SPEC — spec.md "Como/quiero/para" + AC-N + target T0
2. GHERKIN — features/*.feature (Given/When/Then)
3. RED — test que falla (vitest)
4. GREEN — implementar mínimo
5. MUTATION — Stryker (timeboxed, NUNCA en hot path)
6. E2E escenario — Playwright (≥1 por user story) — PROHIBIDO deploy sin esto
7. VERIFICACIÓN EXTERNA — test/exit codes reales, NUNCA auto-crítica

## Suite actual — 67 tests verdes (15 archivos)
| Archivo | Qué valida | Por qué existe | Mutation cubre |
|---|---|---|---|
| `tests/registry.test.ts` (5) | contrato de tools (ToolSpec/registry) | no romper `src/core` sin versionar | sí |
| `tests/detect.test.ts` (16) | detección de stack por manifestos | stack determinista, no adivinar | sí |
| `tests/parse.test.ts` (5) | parser tree-sitter (5 gramáticas) | símbolos/imports/calls correctos | sí |
| `tests/graph.test.ts` (3) | indexador SQLite incremental | grafo persistido, idempotente | sí |
| `tests/queries.test.ts` (6) | explore/callers/callees/impact | blast radius acotado | sí |
| `tests/mcp-server.test.ts` (4) | vista MCP + progressive disclosure tokens | tokens no queman contexto | sí |
| `tests/cli.test.ts` (3) + `cli-plan.test.ts` (3) | CLI AXI (JSON, plan real + TOON) | agente opera determinista | sí |
| `tests/rg.test.ts` (3) | conector ripgrep (search.rg) | busca sin leer archivos masivos | sí |
| `tests/install.test.ts` (4) | `install` (SKILL.md + wiring MCP) | instalable + controlable por agente | sí |
| `tests/acp.test.ts` (3) | adapter ACP (proyecta contrato) | IDE ACP opera el motor | sí |
| `tests/plugin.test.ts` (2) | Agent Plugin 1.0.0 generator | empaque "build once run anywhere" | sí |
| `tests/curator.test.ts` (4) | curator determinista | auto-mejora con señal EXTERNA | sí |
| `tests/policy.test.ts` (4) | policy cross-client (parity) | misma intención = misma decisión | sí |
| `tests/cross-os.test.ts` (2) | portabilidad de paths | no hardcodea separadores | sí |

## Gherkin ejecutable
- **9 features**: `features/{graph,queries,acp,cli-plan,rg,install,policy,plugin,curator}.feature` (Given/When/Then).
- **Invariante clave**: el contrato de tools (`src/core`) nunca expone secrets; las 4 vistas (MCP/ACP/CLI/plugin) proyectan el MISMO `ToolRegistry` (DEC-005 §3).
- **Mutation**: Stryker (core 100%, global >70%, incremental).

## Invariantes de dominio (mutation testing)
- El contrato de tools nunca expone secrets.
- Policy fail-closed (sin contexto → deny).
- Curator nunca borra (stale → mark_review), auto-mejora con señal externa.
- `install` idempotente (re-ejecutar no duplica).
