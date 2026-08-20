# PROYECTO — Netrunner — Universal Agent CDK

> Capa de conocimiento local de este repo (versionada, committeada).
> NO es estado del agente: es contexto decidido para cualquiera que trabaje aquí.
> Fuente de verdad GLOBAL: Engram. Fuente LOCAL de contexto: este archivo + RULES/DECISIONS/TESTING/CONTEXT.
> Este repo es **open-source público** y será continuado por otras terminales de Hermes:
> todo el contrato y contexto de inicialización vive aquí, versionado.

## Propósito

**CDK universal que, con un solo `init`, convierte CUALQUIER proyecto/app/demo en agente-operable para CUALQUIER agente** (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP), + auto-mejora interna.

- **Diferenciador** (tagline): *"Plug any project into any agent."*
- Con un solo comando se genera la capa de conectividad completa (MCP server + Agent Plugin + SKILL + AGENTS.md) que cualquier agente entiende.
- Incluye auto-mejora: background review fork + curator determinista + Memento-Skills, anclado a señal externa.

## Stack (verificado por auditoría — DEC-001)

- **Lenguaje/framework**: TypeScript + Bun + pnpm (motor). Razón validada:
  - Ecosistema agentes/MCP/dsh es TypeScript.
  - Bun: 2–4x Node + binario standalone (facilita distribución del CLI).
  - pnpm: más seguro (allowBuilds, minimumReleaseAge, blockExoticSubdeps).
- **Hot paths**: a Rust (napi-rs) SOLO si un benchmark lo exige (no por defecto).
- **Andamiaje obligatorio**: DeepSeek Harness (dsh) — Cordis/TS, plugin tree reversible, session log traceable.
- **Estándar de tools**: AXI (kunchenguid/axi) — agent-native CLI > MCP en precisión/costo.
- Target hosting: **T0** (free/CLI open-source, sin servidores obligatorios).
- Dependencias clave: Vercel AI SDK v7 (harness-adapters), MCP server, Agent Plugins 1.0, dsh, AXI.

## Arquitectura (validada — DEC-001)

**Capa de orquestación SOBRE estándares** (NO reinventar protocolo):
- Vercel AI SDK v7 harness-adapters (adapters de harness por agente).
- MCP server (transporte universal).
- Agent Plugins 1.0 (`plugin.json` + `skills/` + `mcp.json`).

**SU capa propia** (lo que diferencia a Netrunner):
- Generador `init` (scaffolds la capa de conectividad).
- Policy cross-client (misma intención, distinto agente).
- Router de harnesses (mueve la llamada entre agentes/adapters).

**Auto-mejora**:
- Background review fork de Hermes (loop de revisión en paralelo).
- Curator determinista (filtra mejoras por señal externa, no auto-crítica).
- Memento-Skills (skills en markdown + router/writer), anclado a señal externa.

## MVP 90 días

1. `motor init` — genera MCP + plugin + SKILL + AGENTS.md para un proyecto.
2. `motor add <agente>` — conecta a un agente concreto (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP).
3. `motor policy` — policy cross-client.
4. Fork de auto-revisión (background review).

## Referencias (verificadas)

- deepseek-ai/deepseek-harness (172k★)
- kunchenguid/axi (1.9k★)
- agent-plugins.org (Agent Plugins 1.0)
- modelcontextprotocol.io (MCP)
- vercel AI SDK v7 (harness-adapters)

## Nombre

`netrunner` (cyberpunk — arquetipo que conecta cualquier sistema). Libre en npm + GitHub.

## Cómo trabajar acá

1. Leer este archivo + RULES.md + DECISIONS/ ANTES de tocar código.
2. Escribir spec/Gherkin antes de implementar (loop PRO: spec → gherkin → TDD → mutation → e2e).
3. Actualizar TESTING.md cuando cambien los tests (qué validan y por qué).
4. Correr los guards (onyx-stack-guard, onyx-target-check) antes de escribir código.
5. Guardar decisiones de arquitectura/bugs/descubrimientos en Engram (mem_save) + DECISIONS/.
6. Este repo es público: PROHIBIDO commitear secrets, .env, o credenciales (Mandamiento 7).
7. El motor se construye en fases posteriores — esta inicialización es el contrato base.
