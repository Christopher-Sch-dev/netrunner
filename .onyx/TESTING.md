# TESTING — Netrunner — Universal Agent SDK

> Los tests y POR QUÉ existen. Qué validan, qué responden, qué prueban.
> Actualizar cada vez que cambien tests o se agreguen.

## Pipeline obligatorio
1. SPEC — spec.md "Como/quiero/para" + AC-N + target T0
2. GHERKIN — features/*.feature (Given/When/Then)
3. RED — test que falla (vitest)
4. GREEN — implementar mínimo
5. MUTATION — Stryker (timeout 300s, NUNCA en hot path)
6. E2E escenario — Playwright (≥1 por user story) — PROHIBIDO deploy sin esto
7. VERIFICACIÓN EXTERNA — test/exit codes reales, NUNCA auto-crítica

## Suite actual
| Archivo | Qué valida | Por qué existe | Mutation cubre |
|---|---|---|---|
| _(completar)_ | _(qué comportamiento)_ | _(qué bug/regresión previene)_ | _(sí/no + score)_ |

## Gherkin ejecutable
- Features: _(completar: features/*.feature → runner)_
- Escenarios cubren: _(completar: init, install, policy, ...)_

## Invariantes de dominio (mutation testing)
- _(completar: qué invariantes los tests protegen — p.ej. el contrato de tools nunca expone secrets)_
- _(completar: mutantes equivalentes documentados y por qué no se matan)_
