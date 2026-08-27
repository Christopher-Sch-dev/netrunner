# Gherkin — Conectar policy al registry (ICE bloquea ops mutating)

## SPEC (Mandamiento 0 + 7 — SECURITY MAXING)
**Como** el motor Netrunner,
**quiero** que el registry consulte la policy ANTES de ejecutar una tool mutating,
**para** que el ICE bloquee (no solo reporte) las operaciones destructivas sin approval
(el gap CRÍTICO de la auditoría: policyHook estaba vacío, M7 incumplido).

## Acceptance Criteria
- **AC-1**: `registry.onPolicyCheck(hook)` registra un hook que decide allow/deny.
- **AC-2**: en `registry.call()`, si la tool NO es readOnly, consulta el policyHook; si deniega → lanza (bloquea, fail-closed).
- **AC-3**: tools readOnly se ejecutan siempre (lectura permitida).
- **AC-4**: sin policyHook registrado → tools mutating se bloquean (fail-closed por defecto).

## Escenarios
```
Feature: Conectar policy al registry

  Scenario: tool mutating sin approval → bloqueada
    Given un registry con policyHook que deniega sin approval
    When  call una tool no-readOnly
    Then  lanza (deny)

  Scenario: tool readOnly → siempre se ejecuta
    When  call una tool readOnly
    Then  ejecuta

  Scenario: sin policyHook → mutating bloqueada (fail-closed)
    Given un registry sin policyHook
    When  call una tool no-readOnly
    Then  lanza (deny por defecto)
```
