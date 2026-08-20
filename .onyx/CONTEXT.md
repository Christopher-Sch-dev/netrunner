# CONTEXTO — Netrunner — Universal Agent CDK

> Funcionalidades excepcionales, gotchas, data importante para recordar
> cuando se trabaja en ESTE repo. (No estado — conocimiento.)

## Funcionalidades excepcionales
- CDK universal: un solo `init` convierte CUALQUIER proyecto en agente-operable para CUALQUIER agente.
- Capa de orquestación SOBRE estándares (Vercel AI SDK v7 harness-adapters + MCP + Agent Plugins 1.0), NO reinventa protocolo.
- Auto-mejora interna (background review fork + curator determinista + Memento-Skills) anclada a señal externa.

## Gotchas / trampas conocidas
- Este repo es OPEN-SOURCE público: NUNCA commitear secrets, .env ni credenciales (Mandamiento 7).
- El motor se construye en fases POSTERIORES. Esta inicialización (repo + .onyx + spec.md + DEC-001) es el CONTRATO BASE — no inventar código fuera de las fases.

## Data importante para recordar
- Repo: github.com/Christopher-Sch-dev/netrunner (público, main).
- Stack: TypeScript + Bun + pnpm · Target T0 · dsh + AXI.
- Referencias: deepseek-ai/deepseek-harness (172k★), kunchenguid/axi (1.9k★), agent-plugins.org, modelcontextprotocol.io, Vercel AI SDK v7.
- MVP 90 días: motor init / motor add <agente> / motor policy + fork de auto-revisión.

## Historia reciente
- 2026-08-20: inicialización del repo — .onyx (PROJECT/RULES/DECISIONS/TESTING/CONTEXT), spec.md raíz (destraba onyx-target-check), DEC-001 (decisión fundacional). Estado guardado en Engram (cris/netrunner-2026).
