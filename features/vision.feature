# Gherkin — Visión universal: init AC-1, guard código roto, uninstall, history

## SPEC (Mandamiento 0) — la visión de Cris ampliada

**Como** un agente que opera un proyecto Netrunner,
**quiero** que el motor sea la herramienta que se ADHIERE a mi cabeza (para decidir, delegar, observar, auditar), no un mapeador de archivos,
**para** que cualquier proyecto se conecte a cualquier agente de forma completa y universal (AC-1), reversible (AC-8), con memoria (history) y con integridad verificable (guard detecta código roto).

## La visión (ampliada de lo que Cris dijo)

Netrunner NO es "indexar un repo". Es:
- **Decidir**: plan real que usa el grafo, no un stub.
- **Observar**: history de operaciones — el agente recuerda qué hizo y qué puede hacer.
- **Auditar**: guard detecta código roto (imports/refs inválidos), no solo secrets.
- **Conectar**: init genera el conectable layer completo (AC-1). uninstall lo revierte (AC-8).
- **Adherirse**: cada comando le dice al agente QUÉ HACER DESPUÉS (nextSteps), no solo datos crudos.

## Acceptance Criteria

### AC-1 (init conecta, no solo indexa)
- **AC-1.1**: `netrunner init` indexa Y genera `mcp.json` + `SKILL.md` + `AGENTS.md` en el proyecto (conectable layer).
- **AC-1.2**: idempotente — re-init no duplica.

### AC-8 (reversible)
- **AC-8.1**: `netrunner uninstall [target]` revierte lo que `install` generó (borra mcp.json/SKILL.md wiring).

### History (observar / adherirse)
- **AC-H1**: `netrunner history` devuelve las últimas operaciones del agente (timestamp | command | status), de `.netrunner/history.log`.
- **AC-H2**: cada comando exitoso apende su operación al history (auto-observabilidad).

### Guard (auditar integridad, no solo secrets)
- **AC-G1**: `guard` detecta imports/refs inválidos (archivo que importa un módulo que no existe).
- **AC-G2**: `guard` sigue reportando secrets (no pierde lo que ya detecta).

## Escenarios
```
Feature: Visión universal

  Scenario: init conecta
    Given un proyecto
    When  netrunner init
    Then  genera mcp.json + SKILL.md + AGENTS.md

  Scenario: uninstall revierte
    Given un proyecto instalado
    When  netrunner uninstall
    Then  borra el wiring

  Scenario: history observa
    When  netrunner status (éxito) y netrunner history
    Then  history incluye la operación status

  Scenario: guard detecta código roto
    Given un proyecto con un import inexistente
    When  netrunner guard
    Then  issues incluye el import roto
```
