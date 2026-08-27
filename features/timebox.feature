# Gherkin — Timebox por operación (src/tools/ops.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que las operaciones deterministas (test/build/lint) tengan un timebox,
**para** que un test que cuelga no cuelgue el loop del agente para siempre
(bug real de robustez que el validador marcó como #2).

## Acceptance Criteria
- **AC-1**: `runOp(kind, dir, timeoutMs)` mata el proceso si excede el timebox.
- **AC-2**: devuelve { ok: false, exitCode: -1, output } con señal de timeout.
- **AC-3**: PURE/determinista: timeoutMs default (ej. 30s) si no se pasa.
- **AC-4**: no rompe las operaciones que terminan a tiempo.

## Escenarios
```
Feature: Timebox por operación

  Scenario: operación que cuelga → timeout
    Given un script que duerme 10s
    When  runOp('test', dir, 1000)
    Then  devuelve { ok: false, exitCode: -1 } con señal de timeout

  Scenario: operación normal → termina a tiempo
    When  runOp('test', dir, 30000)
    Then  devuelve { ok: true, exitCode: 0 }
```
