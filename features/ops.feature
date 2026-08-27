# Gherkin — ops (control determinista) (src/tools/ops.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** ejecutar operaciones deterministas del proyecto (test/build/lint/config),
**para** controlar el proyecto de forma autónoma y segura (AC-6), con exit codes
estándar y separación read vs mutate.

## Acceptance Criteria (AC-6 del spec + validador de scope P0-2)
- **AC-1**: `runOp(kind, projectDir)` ejecuta la operación determinista del stack
  (test → `pnpm test`/`npm test`/`bun test` según packageManager; build → `pnpm build`; lint → `pnpm lint`).
- **AC-2**: devuelve { ok, exitCode, output } — determinista, con señal externa real (exit code).
- **AC-3**: es una ToolSpec del contrato (`op.test`/`op.build`/`op.lint`, family `op`, readOnly=false).
- **AC-4**: operación desconocida → error estructurado (no inventa comandos).
- **AC-5**: respeta el packageManager detectado (no hardcodea pnpm).

## Escenarios
```
Feature: ops (control determinista)

  Scenario: ejecuta test del stack
    Given un proyecto con packageManager pnpm
    When  runOp('test', dir)
    Then  ejecuta 'pnpm test' y devuelve { ok, exitCode }

  Scenario: operación desconocida → error
    When  runOp('deploy', dir)
    Then  lanza error (no inventa comando)
```
