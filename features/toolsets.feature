# Gherkin — Matriz stack→toolsets declarativa (src/transport/toolsets.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que la matriz stack→toolsets sea DECLARATIVA (no hardcodeada en mcp-server),
**para** que cada stack del proyecto active los toolsets correctos de forma determinista
y extensible (progressive disclosure basado en contexto y permisos).

## Acceptance Criteria (P0-4 del validador de scope)
- **AC-1**: `STACK_TOOLSETS` es una matriz declarativa: { stack: string[], toolsets: string[] }.
- **AC-2**: `toolsetsForStack(stack)` devuelve los toolsets activados por el stack (determinista).
- **AC-3**: un stack TS activa graph+stack+ops; un stack python activa graph+stack (sin ops si no aplica).
- **AC-4**: extensible: agregar una fila a la matriz activa toolsets sin tocar mcp-server.

## Escenarios
```
Feature: Matriz stack→toolsets

  Scenario: stack TS activa graph+stack+ops
    Given stack {language:'typescript'}
    When  toolsetsForStack(stack)
    Then  incluye 'graph', 'stack', 'ops'

  Scenario: stack python activa graph+stack
    Given stack {language:'python'}
    Then  incluye 'graph', 'stack' (y ops si aplica)
```
