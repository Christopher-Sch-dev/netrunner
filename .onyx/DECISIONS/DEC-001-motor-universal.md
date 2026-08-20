### DEC-001 — Motor universal sobre estándares + stack TS/Bun/pnpm + dsh/AXI + auto-mejora

- **Fecha**: 2026-08-20
- **Decisión** (Given/When/Then):

  **GIVEN** un motor CDK que debe conectar cualquier proyecto a cualquier agente (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) sin reinventar protocolo y con auto-mejora,
  **WHEN** se define la arquitectura fundacional del motor Netrunner,
  **THEN** se adopta: (1) capa de orquestación SOBRE estándares (Vercel AI SDK v7 harness-adapters + MCP server + Agent Plugins 1.0) con capa propia de generador `init`, policy cross-client y router de harnesses; (2) stack TypeScript + Bun + pnpm; (3) DeepSeek Harness (dsh) como andamiaje y AXI (kunchenguid/axi) como estándar de tools; (4) auto-mejora = background review fork + curator determinista + Memento-Skills anclado a señal externa.

- **Por qué**:
  - El ecosistema de agentes/MCP/dsh es TypeScript → TS evita fricción.
  - Bun da 2–4x Node + binario standalone (distribución del CLI simple).
  - pnpm es más seguro (allowBuilds, minimumReleaseAge, blockExoticSubdeps).
  - Reutilizar estándares (AI SDK v7, MCP, Agent Plugins) maximiza compatibilidad con cualquier agente y minimiza superficie propia a mantener; la capa propia (init/policy/router) es lo que diferencia a Netrunner.
  - dsh da plugin tree reversible + session log traceable (andamiaje probado). AXI (agent-native CLI) supera a MCP en precisión/costo para tools.
  - Auto-mejora anclada a señal externa evita el sesgo de auto-crítica (LLMs cannot self-correct, ICLR 2024).
  - Nombre `netrunner`: libre en npm + GitHub (cyberpunk — conecta cualquier sistema).

- **Alternativas rechazadas**:
  - *Inventar un protocolo de conectividad propio* → rompe compatibilidad con agentes existentes; rechazado.
  - *Node + npm* → más lento (runtime) y menos seguro que Bun+pnpm; rechazado.
  - *MCP como único canal de tools* → menos preciso/costoso que AXI; MCP se usa como transporte universal, AXI para tools.
  - *Rust como stack principal* → solo hot paths si un benchmark lo exige; evita fricción de ecosistema.

- **Spec/Gherkin relacionado**: spec.md (AC-1, AC-3, AC-7, AC-8).
