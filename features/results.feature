# Gherkin — Log de resultados del curator (src/auto/results.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** un log append-only de resultados del curator (TSV parseable),
**para** que la auto-mejora quede anclada a señal externa medible y comparable
(validador #5 — patrón `log.md` de Karpathy + `results.tsv` de autoresearch).

## Acceptance Criteria
- **AC-1**: `appendResult(log, entry)` agrega una línea TSV (timestamp | symbol | action | ok).
- **AC-2**: `readResults(log)` devuelve las entradas parseadas.
- **AC-3**: PURE/determinista: log vacío → []; append idempotente (no duplica la misma entrada).
- **AC-4**: formato TSV parseable (grep-friendly, estilo Karpathy log.md).

## Escenarios
```
Feature: Log de resultados del curator

  Scenario: append + read roundtrip
    Given un log
    When  appendResult(log, {symbol:'login', action:'upsert_skill', ok:true})
    Then  readResults(log) incluye la entrada

  Scenario: log vacío → []
    Then  readResults(log) es []
```
