### DEC-005 — Metodología de construcción de Netrunner (validada de Vercel/dsh/CodeGraph/Graphify/AXI)

- **Fecha**: 2026-08-20
- **Decisión** (Given/When/Then):

  **GIVEN** Netrunner es un motor-universal (TS+Bun+pnpm, MIT) que centraliza tools y conecta N harnesses vía 1 contrato central + 4 vistas,
  **WHEN** se define la metodología correcta de construcción (descomposición de scope, planificación, interconexión, versionado, testing, CI/CD),
  **THEN** se adoptan los patrones verificados de los líderes (Vercel AI SDK, dsh/DeepSeek, CodeGraph, Graphify, AXI, Agent Plugins), con un **plan de fases** y una **matriz de testing de universalidad**.

- **Por qué (patrones reales de los líderes, 17+ fuentes verificadas)**:
  1. **Descomposición**: núcleo-contrato mínimo + adaptadores/plugins (monorepo pnpm), empezando por un **slice vertical funcional** (1 tool × 1 harness × 1 vista), NO una capa horizontal teórica.
  2. **Planificación**: spec-first + ADR-in-repo (`.onyx/DECISIONS/`), issue-first con test que falla primero. Para el contrato universal: proceso tipo Agent Plugins (discusión → propuesta multi-implementador → spec versionada → conformance).
  3. **Interconexión sin acoplamiento**: interface-first tipada (Vercel `LanguageModelV4`/`HarnessV1`) + capability-seam con DI (dsh Cordis `inject`) + edge-provenance (Graphify `EXTRACTED`/`INFERRED`) + output-contract (AXI TOON). Regla Vercel: *el contrato manda; el harness que no se adapta se rechaza*.
  4. **Versionado**: contrato versionado en la interfaz (V1/V2, nunca mutar el vigente). Cada vista/harness = package con semver+changesets. Toda breaking change lleva codemod. `plugin.json` declara versión de contrato. Conformance tests como gate.
  5. **Testing**: real-implementation-over-mock (mocks solo LLM/red/reloj) + **parity tests entre las 4 vistas** (la misma tool debe dar el mismo resultado en MCP/ACP/Plugin/CLI) + gate de cobertura + e2e hermético Playwright + benchmarks reproducibles + mutation (Stryker).
  6. **Universalidad = matriz cartesiana** `núcleo × agentes × stacks × OS × protocolos`, cada eje con su técnica (adaptadores por agente, golden por stack, matrix CI por OS, conformance ACP/MCP).

- **Plan de fases (anclado a patrones de los líderes)**:
  - F0 — Contrato: `src/core` con interfaces versionadas (`ToolV1`, `HarnessAdapterV1`) + ADRs + conformance test.
  - F1 — **MVP vertical slice**: 1 tool (ripgrep) × 1 harness (Hermes/Claude Code) × 1 vista (MCP), probado end-to-end con parity + e2e. *(Vercel empezó con 1 provider, CodeGraph con 1 lenguaje.)*
  - F2 — Plantilla de vistas: las 4 vistas como packages, gate = parity test.
  - F3 — Matriz de harnesses: adaptador por agente (Claude/Codex/Hermes/OpenCode/Cursor/dsh/fx).
  - F4 — Orquestación de tools (semgrep/SCIP/LSP/Stryker/Zod/jsonrepair/Playwright) como providers.
  - F5 — CI/CD maduro (dsh-style: gates paralelos, cobertura+parity, e2e hermético, dual-Windows, failover) + release con changesets+codemods + benchmarks reproducibles.
  - F6 — Gobernanza (opcional, modelo Agent Plugins: TSC, conformance).

- **Matriz de testing de universalidad** (10 tipos, mapeados a mandamientos 6/10):
  1. Contract test del núcleo · 2. Conformance ACP/MCP · 3. Matrix de adaptadores de agente · 4. Golden tests por stack · 5. CI matrix por OS · 6. Cross-OS unit tests (paths/EOL/symlink) · 7. Snapshot de API pública · 8. Smoke en agentes reales · 9. Mutation sobre los tests de compat · 10. Benchmark reproducible. *Regla: el núcleo es agnóstico; cada test cambia UN parámetro (agente/stack/OS) y el resultado debe ser idéntico.*

- **Alternativas rechazadas**:
  - *Monolito modular o feature-slicing horizontal* → los líderes usan núcleo-contrato + adaptadores; rechazado.
  - *RFC externo pesado* → spec-first + ADR-in-repo es lo que usan Vercel/dsh; rechazado.
  - *Construir las 4 vistas + todos los harnesses de una vez* → contradice el slice vertical de los líderes; rechazado.

- **Spec/Gherkin relacionado**: spec.md (AC-1..14). Reportes completos en `.doc/auditoria/` (gitignored).
