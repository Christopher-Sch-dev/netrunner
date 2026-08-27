# Gherkin — daemon-senal: harvest de observaciones reales para el curator

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que el daemon alimente al curator con observaciones REALES (harvest de history.log + events.log),
**para** que el "curator fantasma" deje de ser un esqueleto sin datos (hoy `curate([])` siempre) y la auto-mejora se ancle a señal externa real.

## Acceptance Criteria
- **AC-1**: `harvest(projectDir)` convierte history.log + events.log en `Observation[]`.
- **AC-2**: ops exitosas (op/result ok) → observación `usage` con ok=true.
- **AC-3**: ops fallidas (op/error) → observación `usage` con ok=false.
- **AC-4**: `daemonTick` usa harvest (no `curate([])`).
- **AC-5**: sin history/events → observaciones vacías (no falla).

## Escenarios
```
Feature: daemon-senal (harvest de observaciones)

  Scenario: ops exitosas alimentan al curator
    Given un proyecto con events.log con op/result ok
    When  harvest
    Then  observaciones incluyen usage ok=true

  Scenario: ops fallidas alimentan al curator
    Given un proyecto con events.log con op/error
    When  harvest
    Then  observaciones incluyen usage ok=false

  Scenario: daemon usa harvest
    When  daemonTick
    Then  curate recibe observaciones reales (no [])
```
