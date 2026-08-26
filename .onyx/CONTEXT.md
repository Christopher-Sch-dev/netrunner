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
- 2026-08-20: `src/context/detect.ts` — detección determinista de stack por manifestos (package.json+lockfiles→ts/js pnpm/npm/yarn/bun + framework astro/react/next/vite, pyproject/requirements→python pip/poetry/uv, Cargo→rust, go.mod→go; manifiesto ilegible→ausente). `detectStack(dir): Promise<StackInfo>` (consume types.ts). Tests `tests/detect.test.ts` (16 casos, AC-D1..D7), mutation 82.88%.
- 2026-08-20: `src/context/queries.ts` — queries de lectura del grafo SQLite (index.db, AC-5): `explore(name)`, `callers(symbolId)`, `callees(symbolId)`, `impact(symbolId, depth=2)` (BFS acotado). Vía bun:sqlite, LIMIT 100 nodos con `truncated=true`. Tests `tests/queries.test.ts` (6 casos, AC-5.1..5.5) con mock de bun:sqlite vía node:sqlite para correr bajo vitest; Gherkin `features/queries.feature`.
- 2026-08-20: `src/context/parse.ts` — parser de símbolos con tree-sitter WASM (typescript/tsx/javascript, python, go, rust). `parseFile(code, lang)` → defs/imports/calls (símbolos planos sin id/file). `parseDefinitions/parseImports/parseCalls`. Tests `tests/parse.test.ts` (5 casos, AC-G1..G4). Deps: web-tree-sitter + tree-sitter-wasms.
- 2026-08-20: `src/context/types.ts` — ancla de tipos (StackInfo/GraphNode/GraphEdge/QueryResult).
- 2026-08-20: `src/context/graph.ts` — indexador del grafo (AC-1/AC-5): `indexProject(dir, {incremental})` recorre archivos fuente → parseFile → persiste en `<proyecto>/.netrunner/index.db` (tablas nodes/edges, CREATE IF NOT EXISTS). incremental=true solo re-indexa archivos con mtime cambiado (tabla index_meta). Idempotente. Usa bun:sqlite (para correr en Bun runtime; vitest lo mockea). Tests `tests/graph.test.ts` (3 casos, AC-G1..G4). Completa la Wave 1 (detect + parse + graph + queries).
- 2026-08-20: `src/transport/mcp-server.ts` — servidor MCP (AC-3 vista MCP, AC-9 progressive disclosure). `createServer(dir)` construye el McpServer (SDK @modelcontextprotocol 1.30, zod 4); `serveMCP(dir)` arranca por stdio. **DIFERENCIADOR DE TOKENS**: al conectar expone SOLO meta-tools (net_available_toolsets, net_enable_toolset); al habilitar un toolset (derivado del stack) registra dinámicamente sus tools (net_explore/callers/callees/impact/net_stack). Idempotente (no duplica). Tests `tests/mcp-server.test.ts` (4 casos, AC-M1..M3) con InMemoryTransport+Client real (conformance MCP). Deps: @modelcontextprotocol/sdk, zod.
- 2026-08-20: `src/cli.ts` — CLI agent-friendly (AC-4 dashboard, AC-6 ops, AC-14 ai-native-cli). JSON output por defecto, `--human`, exit 0/1/2, errores estructurados a stderr. Comandos: (sin arg)=dashboard, `init <dir>` (indexa grafo), `plan "<goal>"`, `explore <sym>`, `--mcp` (arranca server MCP stdio), `--version`. Tests `tests/cli.test.ts` (3 casos, AC-4/14). **`graph.ts` usa bun:sqlite** (no node:sqlite) para que el CLI corra en Bun runtime (node:sqlite no existe en Bun) — vitest lo mockea.
