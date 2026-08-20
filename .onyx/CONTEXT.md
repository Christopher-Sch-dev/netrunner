# CONTEXTO — Netrunner — Universal Agent SDK

> Funcionalidades excepcionales, gotchas, data importante para recordar
> cuando se trabaja en ESTE repo. (No estado — conocimiento.)

## Funcionalidades excepcionales
- SDK universal: un solo binario convierte CUALQUIER proyecto en agente-operable para CUALQUIER agente.
- Un solo motor es a la vez AI SDK + MCP server + skill + plugin + grafo + control agéntico (vistas del mismo contrato de tools).
- Auto-mejora interna (background review fork + curator determinista + Memento-Skills) anclada a señal externa.

## Gotchas / trampas conocidas
- Este repo es OPEN-SOURCE público: NUNCA commitear secrets, .env ni credenciales.
- El motor se construye en fases posteriores. Esta inicialización (repo + .onyx + spec.md + DEC-001) es el CONTRATO BASE — no inventar código fuera de las fases.
- El contrato de tools `src/core` es el núcleo: no romperlo sin versionar (extensibilidad).
- **CI**: GitHub Actions está DESACTIVADO (billing de la cuenta). El gate real es el CI local (`scripts/ci-local.sh` + hooks). Workflows versionados en `scripts/ci-github/` (restaurar cuando se resuelva billing).

## Data importante para recordar
- Repo: github.com/Christopher-Sch-dev/netrunner (público, main).
- Stack: TypeScript + Bun + pnpm · Target T0 · dsh + AXI.
- Referencias: colbymchenry/codegraph, Graphify-Labs/graphify, deepseek-ai/deepseek-harness, kunchenguid/axi, agent-plugins.org, modelcontextprotocol.io, Vercel AI SDK v7.
- MVP 90 días: netrunner init / install / policy + fork de auto-revisión.

## Historia reciente
- 2026-08-20: inicialización del repo — .onyx (PROJECT/RULES/DECISIONS/TESTING/CONTEXT), spec.md raíz (destraba target-check), DEC-001 (decisión fundacional).
- 2026-08-20: re-validación 2026 (3 auditorías) → DEC-002: se mantiene TS+Bun+pnpm + motor-unificado + pipeline, con ajustes (MCP 2026-07-28 stateless, ACP v2, sandbox separado, context-graph+MemGPT, property-based+golden, Vitest). Reportes en `.doc/auditoria/` (gitignored).
