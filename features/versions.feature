# Gherkin — Detector de versiones (src/context/versions.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** conocer las versiones de las dependencias instaladas (separadas y ordenadas),
**para** que la skill auto-generante documente qué versiones se usan (prod vs dev),
como pidió: "las versiones de lo que tenemos instalado separado y ordenado".

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `versionsInfo(projectDir)` devuelve { prod: Record<string,string>, dev: Record<string,string> }.
- **AC-2**: lee `package.json` (dependencies → prod, devDependencies → dev).
- **AC-3**: PURE/determinista: si no hay package.json → { prod: {}, dev: {} } (no falla).
- **AC-4**: ordenado (las claves ordenadas alfabéticamente).

## Escenarios
```
Feature: Detector de versiones

  Scenario: package.json con deps prod y dev
    Given package.json con dependencies {react: ^18} y devDependencies {vitest: ^2}
    When  versionsInfo(dir)
    Then  prod.react = '^18', dev.vitest = '^2'

  Scenario: sin package.json
    Then  { prod: {}, dev: {} } (no falla)
```
