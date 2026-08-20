# Spec — Netrunner: Universal Agent CDK

> Especificación raíz del motor. Destraba `onyx-target-check`. Se implementa en fases posteriores.

## Como / quiero / para

**Como** desarrollador/creador con cualquier proyecto, app o demo (cualquier stack),
**quiero** un único comando `netrunner init` que genere la capa de conectividad agente-operable (MCP server + Agent Plugin + SKILL + AGENTS.md) y comandos para conectar agentes y aplicar policy,
**para** poder enchufar cualquier proyecto a cualquier agente (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) sin reinventar protocolo y con auto-mejora interna.

## Target

**T0** — CLI open-source gratuito, sin servidores obligatorios, corre local en el proyecto del usuario. (Despliegue opcional de MCP server en T1/T2.)

## Acceptance Criteria (AC)

### Motor `init`
- **AC-1**: `netrunner init` sobre un proyecto existente genera la capa agente-operable: `mcp.json`/servidor MCP, `plugin.json` + `skills/` (Agent Plugins 1.0), un archivo `SKILL` markdown legible por cualquier agente, y `AGENTS.md`.
- **AC-2**: `netrunner init` es idempotente: re-ejecutarlo no duplica artefactos ni rompe lo generado.
- **AC-3**: Los artefactos generados usan estándares (Vercel AI SDK v7 harness-adapters + MCP + Agent Plugins 1.0) — NO reinventan protocolo.

### Conectar agentes
- **AC-4**: `netrunner add <agente>` conecta un proyecto a un agente concreto entre Claude Code, Codex, Hermes, OpenCode, Cursor y MCP, produciendo la config/contrato específico de ese agente.
- **AC-5**: `netrunner add` es reversible (puede deshacer la conexión sin dejar residuos).

### Policy cross-client
- **AC-6**: `netrunner policy` aplica/lee una misma policy (intención) en distintos agentes de forma consistente, sin duplicar la definición.

### Auto-mejora
- **AC-7**: El motor expone un fork de auto-revisión (background review) con curator determinista, cuyas mejoras quedan ancladas a señal externa (resultado real), NO a auto-crítica.
- **AC-8**: Las mejoras se materializan como Memento-Skills (skills en markdown + router/writer) versionadas en el proyecto.

### Calidad/estándar
- **AC-9**: Todo comando del motor sigue el pipeline PRO (spec → gherkin → TDD → mutation) con al menos 1 test por AC.
- **AC-10**: El CLI es agent-friendly y sigue la guía de CLIs para agentes (ai-native-cli).

## Fuera de scope (fase posterior)
- El código fuente del motor (se construye en fases). Esta spec es el contrato raíz.
