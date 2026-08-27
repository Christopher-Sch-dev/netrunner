# Gherkin — skill-sec: escanear Memento-Skills por prompt-injection

## SPEC (Mandamiento 0 + 7 — SECURITY MAXING)
**Como** el motor Netrunner,
**quiero** escanear cada Memento-Skill por prompt-injection/exfiltración ANTES de que el curator lo adopte,
**para** que la auto-mejora no abra un vector de ataque (paper SkillJack: skills envenenadas/backdoors).

## Acceptance Criteria
- **AC-1**: `skillScan(content)` detecta patrones de prompt-injection (ignore previous, system override, exfiltración).
- **AC-2**: skill limpio → { safe: true }.
- **AC-3**: skill con inyección → { safe: false, reason }.
- **AC-4**: el curator NO upsertea un skill que falla el scan.

## Escenarios
```
Feature: skill-sec (scan anti-inyección)

  Scenario: skill limpio
    Given un skill sin inyección
    When  skillScan
    Then  safe: true

  Scenario: skill con inyección
    Given un skill con "ignore previous instructions"
    When  skillScan
    Then  safe: false

  Scenario: curator no adopta skill malicioso
    Given un skill que falla el scan
    When  curate
    Then  no upsert_skill
```
