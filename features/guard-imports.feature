# Gherkin — guard valida imports/símbolos rotos

## SPEC (Mandamiento 0 + 8 — señal externa real)
**Como** un agente que opera un proyecto Netrunner,
**quiero** que el guard detecte imports/refs a módulos que no existen,
**para** que la señal externa sea REAL (no ok:true con código roto — viola M8, el LLM no puede auto-corregirse).

## Acceptance Criteria
- **AC-1**: `guardCheck(dir)` detecta `import {x} from './nonexistent'` → issue `import roto`.
- **AC-2**: sigue detectando secrets (no pierde lo que ya detecta).
- **AC-3**: módulos del proyecto que SÍ existen → sin falsos positivos.
- **AC-4**: solo para archivos que el guard ya escanea (fuente).

## Escenarios
```
Feature: guard valida imports rotos

  Scenario: import a módulo inexistente
    Given un archivo que importa './nonexistent'
    When  guardCheck
    Then  issues incluye 'import roto'

  Scenario: import a módulo existente
    Given un archivo que importa './a' (que existe)
    When  guardCheck
    Then  issues NO incluye 'import roto'
```
