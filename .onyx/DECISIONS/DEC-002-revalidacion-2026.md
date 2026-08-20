### DEC-002 — Re-validación 2026: mantener TS+Bun+pnpm + motor-unificado + pipeline (con ajustes)

- **Fecha**: 2026-08-20
- **Decisión** (Given/When/Then):

  **GIVEN** Netrunner ya definido en DEC-001 con stack TS+Bun+pnpm, arquitectura motor-unificado (1 binario = AI SDK+MCP+skill+plugin+grafo+control) y pipeline spec→Gherkin→TDD→mutation→e2e,
  **WHEN** se re-valida todo contra lo más nuevo de 2026 (3 auditorías, ~40 fuentes, benchmarks reales),
  **THEN** se MANTIENE la columna vertebral y se aplican ajustes de alineación 2026 (no un cambio de base).

- **Por qué (veredictos de 2026)**:
  1. **Stack**: Bun 1.4 es ahora infraestructura oficial de agentes (Anthropic: Claude Code y Claude Agent SDK corren sobre Bun), reescrito Zig→Rust en v1.4, con bytecode compilation, SQLite nativo y cold-start/memoria muy inferiores. Nada nuevo lo supera para este caso de uso. pnpm sigue siendo superior a `bun install` en seguridad de supply chain (minimumReleaseAge, trustPolicy, blockExoticSubdeps) — se mantiene.
  2. **Formato**: el motor-unificado es el formato correcto en 2026. Lo refuerza el estándar de empaquetado que ganó (Agent Plugins 1.0, adoptado por OpenAI/Google/Amazon/Microsoft/Cursor/Vercel), MCP stateless 2026-07-28, y el grafo pre-indexado (codegraph/codemap lo prueban en binarios compilados). Un paper 2026 (Codebase-Memory) describe 1:1 la arquitectura.
  3. **Metodología**: spec→Gherkin→TDD→mutation sigue siendo el estado del arte (OpenSpec 65.7k★ y DAE convergen en lo mismo). Se ajusta la cola: property-based + golden/snapshot como pilar, mantener Vitest (no bun test, por compatibilidad Stryker), contener E2E a smoke.

- **Ajustes de alineación 2026** (no cambian la arquitectura):
  - Migrar transporte MCP a revisión **2026-07-28** (stateless, headers `Mcp-Method`/`Mcp-Name`, `server/discover`, cache `tools/list` con ttlMs). Es breaking vs 2025-11-25 → requiere versionado de contrato.
  - Aprovechar **ACP v2** para la vista harness.
  - Mantener **sandbox/compute separado** del binario (patrón OpenAI "harness ≠ compute").
  - Evolucionar el grafo a **context-graph** (temporalidad + governance + decision-traces) + memoria jerárquica tipo **MemGPT** para auto-mejora persistente entre sesiones.
  - **Property-based testing** (fast-check) en parsers tree-sitter + **golden/snapshot** para AST/SQL. Mantener Vitest como runner (Stryker). E2E Playwright solo smoke.
  - Binario: `bun build --compile --minify --bytecode --target=bun-linux-x64-baseline` (baseline = máx compat, o `-modern` para AVX2). Hot paths a napi-rs (Rust) solo si profiling con `bun --cpu-prof-md` lo exige — no reescritura.

- **Alternativas rechazadas**:
  - *Cambiar a Rust/Go como base* → reescritura mataría la velocidad de iteración (spec+TDD+mutation es más productivo en TS) y no aporta nada que los hot paths napi-rs no cubran. Rechazado.
  - *Cambiar a `bun test`* → rompería compatibilidad con Stryker (mutation testing). Rechazado.
  - *Abandonar el motor-unificado por N herramientas* → contradice el estándar que ganó (Agent Plugins). Rechazado.

- **Spec/Gherkin relacionado**: spec.md (AC-1..14). Reportes completos en `.doc/auditoria/` (gitignored).
