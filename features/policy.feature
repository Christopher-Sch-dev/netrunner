# Gherkin — Policy cross-client (src/policy/index.ts)

## SPEC (Mandamiento 0)
**Como** un proyecto Netrunner con tools que ejecutan operaciones,
**quiero** que una POLICY central decida qué operaciones permitir según el contexto,
**para** que la MISMA intención produzca el MISMO resultado en CUALQUIER agente
(parity cross-agent, DEC-001).

## Acceptance Criteria
- **AC-1**: `evaluatePolicy(intent, context)` es PURE y determinista: misma entrada →
  misma decisión (allow/deny), sin importar qué agente la llame.
- **AC-2**: contexto read-only (explore) → allow por defecto; contexto mutating (edit/destroy)
  → require approval o deny según policy.
- **AC-3**: reglas de policy declarativas (no hardcode por agente) — la policy es transversal.
- **AC-4**: señal ausente (context vacío) → deny por fail-closed (Mandamiento 7).

## Escenarios
```
Feature: Policy cross-client (parity)

  Scenario: misma intención en distintos agentes → misma decisión
    Given context {readOnly:true}
    When  evaluatePolicy("explore")
    Then  allow (idéntico para opencode, claude, codex)

  Scenario: intent mutating sin aprobación → deny
    Given context {readOnly:false, approval:false}
    When  evaluatePolicy("edit")
    Then  deny

  Scenario: sin contexto → deny por default (fail-closed)
    When  evaluatePolicy("cualquier")
    Then  deny
```
