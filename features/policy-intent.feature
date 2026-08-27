# Gherkin — Policy por intención + secrets por proyecto (src/policy/index.ts)

## SPEC (Mandamiento 0)
**Como** un proyecto Netrunner con tools que mutan,
**quiero** que la policy decida permisos por INTENCIÓN tipada + perfil del proyecto,
**para** que el agente tenga autonomía segura (read total, mutate con approval),
y que los secrets estén scopeados por tool (nunca al LLM, Mandamiento 7).

## Acceptance Criteria (P0-3 del validador de scope)
- **AC-1**: `evaluatePolicy(intent, ctx)` usa `Intent` tipado ('explore'|'edit'|'destroy'|'ops').
- **AC-2**: read (explore) → allow; mutate (edit/destroy/ops) sin approval → deny (fail-closed).
- **AC-3**: `resolveSecrets(projectDir, toolId)` devuelve secrets SOLO de esa tool (scopeado), nunca al LLM.
- **AC-4**: sin contexto → deny (fail-closed, Mandamiento 7).

## Escenarios
```
Feature: Policy por intención + secrets

  Scenario: read → allow, mutate sin approval → deny
    Given ctx {readOnly:true} → allow
    And   ctx {readOnly:false, approval:false} → deny

  Scenario: secrets scopeados por tool
    Given un .netrunner/secrets.json con {toolA: {KEY: x}}
    When  resolveSecrets(dir, 'toolA')
    Then  devuelve {KEY: x} (solo toolA, no toolB)
```
