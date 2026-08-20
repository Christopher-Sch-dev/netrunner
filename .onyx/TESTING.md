# TESTING — Netrunner — Universal Agent CDK

> Los tests y POR QUÉ existen. Qué validan, qué responden, qué prueban.
> Actualizar cada vez que cambien tests o se agreguen.

## Pipeline obligatorio (D-333 / engineering-pipeline)
1. SPEC — spec.md "Como/quiero/para" + AC-N + target T0|T1|T2
2. GHERKIN — features/*.feature (Given/When/Then)
3. RED — test que falla (vitest/pytest)
4. GREEN — implementar mínimo
5. INTROVERT — dae_introvert.py (tests no vacíos)
6. MUTATION — onyx-mutate.sh / Stryker (timeout 300s, NUNCA pre_tool_call)
7. E2E escenario — Playwright (≥1 por user story) — PROHIBIDO deploy sin esto
8. REFLECT — mem_save

## Suite actual
| Archivo | Qué valida | Por qué existe | Mutation cubre |
|---|---|---|---|
| _(completar)_ | _(qué comportamiento)_ | _(qué bug/regresión previene)_ | _(sí/no + score)_ |

## Gherkin ejecutable
- Features: _(completar: features/*.feature → runner)_
- Escenarios cubren: _(completar: registrar, editar, eliminar, filtrar, ...)_

## Invariantes de dominio (mutation testing)
- _(completar: qué invariantes los tests protegen — p.ej. precio nunca negativo)_
- _(completar: mutantes equivalentes documentados y por qué no se matan)_
