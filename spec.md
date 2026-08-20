# Spec — Netrunner: Universal Agent CDK

> Especificación raíz del motor-unificado. Destraba el target-check. Se implementa en fases posteriores.
> Arquitectura validada por auditorías (DEC-001): un solo núcleo (contrato de tools) + formatos proyectados (MCP server, harness-adapter, Agent Plugin, CLI/AXI).

## Como / quiero / para

**Como** desarrollador/creador con cualquier proyecto, app o demo (cualquier stack),
**quiero** un solo binario `netrunner` que, al conectarse a mi proyecto, le dé a cualquier agente (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) el **contexto** (grafo de conocimiento), el **uso** (operaciones deterministas) y el **control agéntico** del proyecto,
**para** poder enchufar cualquier proyecto a cualquier agente sin reinventar protocolo, sin fragmentar en N herramientas, y con auto-mejora interna.

## Target

**T0** — CLI open-source gratuito, un binario standalone local, sin servidores obligatorios. (Despliegue opcional de MCP server en T1/T2.)

## Acceptance Criteria (AC)

### Motor-unificado
- **AC-1**: `netrunner init` sobre un proyecto existente indexa el proyecto (grafo de conocimiento) y genera la capa de conectividad agente-operable: `mcp.json`/server MCP, `plugin.json` + `skills/` (Agent Plugins 1.0), un archivo `SKILL` markdown legible por cualquier agente, y `AGENTS.md`.
- **AC-2**: `netrunner init` es idempotente: re-ejecutarlo no duplica artefactos ni rompe lo generado.
- **AC-3**: Un solo binario `netrunner` expone los formatos (MCP server, harness-adapter, Agent Plugin, CLI) como vistas del MISMO contrato de tools (`src/core`) — sin duplicar handlers.

### Entender y controlar
- **AC-4**: `netrunner` (sin argumentos) devuelve un dashboard content-first del proyecto: stack, capabilities, conteo de símbolos/archivos/tests, próximos pasos.
- **AC-5**: `netrunner query/callers/callees/impact` exponen el grafo de conocimiento del proyecto (símbolos, call paths, blast radius) — el agente responde en pocas llamadas, sin grep/read masivo.
- **AC-6**: `netrunner <acción>` ejecuta operaciones deterministas del proyecto (test, build, lint, config, ops de negocio) con exit codes estándar, idempotencia y separación read vs mutate.

### Conectar agentes
- **AC-7**: `netrunner install [--target=claude,codex,...]` conecta el proyecto a agentes concretos (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) emitiendo la config específica de cada uno (MCP/ACP/harness/plugin).
- **AC-8**: `netrunner install` es reversible (puede deshacer la conexión sin dejar residuos).

### Determinismo por contexto/objetivo
- **AC-9**: El motor expone solo las tools relevantes al contexto del proyecto y al objetivo declarado (progressive disclosure), no un menú de 500 tools.

### Policy cross-client
- **AC-10**: `netrunner policy` aplica/lee una misma policy (intención) en distintos agentes de forma consistente, sin duplicar la definición.

### Auto-mejora
- **AC-11**: El motor expone un fork de auto-revisión (background review) con curator determinista, cuyas mejoras quedan ancladas a señal externa (resultado real), NO a auto-crítica.
- **AC-12**: Las mejoras se materializan como Memento-Skills (skills en markdown + router/writer) versionadas en el proyecto.

### Calidad/estándar
- **AC-13**: Todo comando del motor sigue el pipeline PRO (spec → gherkin → TDD → mutation) con al menos 1 test por AC.
- **AC-14**: El CLI es agent-friendly y sigue la guía de CLIs para agentes (ai-native-cli).

## Fuera de scope (fase posterior)
- El código fuente del motor (se construye en fases). Esta spec es el contrato raíz.
