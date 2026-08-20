# PROYECTO — Netrunner — Universal Agent CDK

> Contexto de conocimiento local de este repo (versionado, committeado).
> Este repo es **open-source público**: todo el contrato y contexto de desarrollo vive aquí, versionado, para que cualquier contribuidor (humano o agente) trabaje sin contexto previo.

## Propósito

**CDK universal que, con un solo binario, convierte CUALQUIER proyecto/app/demo en agente-operable para CUALQUIER agente** (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP), + auto-mejora interna.

- **Diferenciador** (tagline): *"Plug any project into any agent."*
- Con un solo comando, el motor le da al agente **contexto** (grafo de conocimiento del proyecto), **uso** (operaciones deterministas) y **control agéntico** (operar el sistema), en una sola pieza — no fragmentado en N herramientas.
- Un solo binario es a la vez **AI SDK + MCP server + skill + plugin + grafo de conocimiento + control agéntico** (vistas del mismo contrato de tools).
- Incluye auto-mejora: background review fork + curator determinista + Memento-Skills, anclado a señal externa.

## Stack (verificado por auditoría — DEC-001)

- **Lenguaje/framework**: TypeScript + Bun + pnpm (motor). Razón validada:
  - Ecosistema de agentes/MCP es TypeScript.
  - Bun: 2-4x Node + binario standalone (facilita distribución universal).
  - pnpm: más seguro (allowBuilds, minimumReleaseAge, blockExoticSubdeps).
- **Hot paths**: a Rust (napi-rs) SOLO si un benchmark lo exige (no por defecto).
- **Andamiaje**: DeepSeek Harness (dsh) — Cordis/TS, plugin tree reversible, session log traceable.
- **Estándar de tools**: AXI (kunchenguid/axi) — agent-native CLI > MCP en precisión/costo.
- Target hosting: **T0** (free/CLI open-source, sin servidores obligatorios).
- Dependencias clave: Vercel AI SDK v7 (harness-adapters), MCP server, Agent Plugins 1.0, dsh, AXI.

## Arquitectura (validada — DEC-001)

**Un solo núcleo + formatos proyectados (NO reinventar protocolo):**
- **Contrato de tools neutral** (`src/core`): ToolSpec + ToolContext + ToolHandler, PURE, testable.
- **4 vistas del mismo contrato** (sin duplicar handlers):
  - **MCP server** (transporte universal, stdio + streamable HTTP).
  - **Harness-adapter** (Vercel AI SDK v7 + ACP).
  - **Agent Plugin** (plugin.json + skills/ + mcp.json, Agent Plugins 1.0).
  - **CLI/AXI** (token-efficient, exit codes, idempotencia).

**Capas del núcleo** (estables, sobre `src/core`):
- **context** — grafo de conocimiento del proyecto (roba CodeGraph/Graphify: SQLite local, tree-sitter wasm, edge EXTRACTED/INFERRED).
- **control** — operaciones deterministas del proyecto (run build/test/lint/op).
- **knowhow** — skills/playbooks versionados (Memento-Skills).
- **storage** — bun:sqlite local, 100% local.
- **policy** — approval/guards/idempotencia.

**Conectores/seams** (swappeables, extensibles):
- filesystem · subprocess · sandbox · git · telemetry (OTel). Cada conector es un plugin (patrón Cordis `ctx.effect` reversible).

**Auto-mejora**:
- Background review fork (loop de revisión en paralelo).
- Curator determinista (filtra mejoras por señal externa, no auto-crítica).
- Memento-Skills (skills en markdown + router/writer), anclado a señal externa.

## MVP 90 días

1. `netrunner init` — indexa el proyecto + genera la capa de conectividad.
2. `netrunner install` — conecta agentes (MCP/ACP/harness/plugin).
3. `netrunner policy` — policy cross-client.
4. Auto-mejora (background review + curator + Memento-Skills).

## Referencias (verificadas)

- colbymchenry/codegraph (grafo de código, MCP+CLI, local)
- Graphify-Labs/graphify (skill install --project, edge EXTRACTED/INFERRED)
- deepseek-ai/deepseek-harness (dsh, "Everything is a Plugin", Cordis)
- kunchenguid/axi (agent-native CLI)
- agent-plugins.org (Agent Plugins 1.0)
- modelcontextprotocol.io (MCP)
- Vercel AI SDK v7 (harness-adapters)

## Nombre

`netrunner` (cyberpunk — arquetipo que conecta cualquier sistema). Libre en npm + GitHub.

## Cómo trabajar acá

1. Leer este archivo + RULES.md + DECISIONS/ ANTES de tocar código.
2. Escribir spec/Gherkin antes de implementar (loop PRO: spec → gherkin → TDD → mutation → e2e).
3. Actualizar TESTING.md cuando cambien los tests (qué validan y por qué).
4. Correr los guards (stack-guard, target-check) antes de escribir código.
5. Guardar decisiones de arquitectura/bugs/descubrimientos en DECISIONS/.
6. Este repo es público: PROHIBIDO commitear secrets, .env, o credenciales.
7. El motor se construye en fases posteriores — esta inicialización es el contrato base.
