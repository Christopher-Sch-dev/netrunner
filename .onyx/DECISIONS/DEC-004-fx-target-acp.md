### DEC-004 — fx (vercel-labs) como target ACP externo + referencia de minimalismo

- **Fecha**: 2026-08-20
- **Decisión** (Given/When/Then):

  **GIVEN** Netrunner es un motor-unificado (contrato de tools central + 4 vistas) que conecta cualquier proyecto con cualquier agente,
  **WHEN** se valida `vercel-labs/fx` (harness de agente en Zig, 1.5k★, Apache-2.0, Experimental),
  **THEN** se integra fx **solo como target ACP externo** (emisor de config ACP) y como **referencia de minimalismo** (7.8 MiB). NO como harness interno, NO como base WASM/Zig. No cambia la arquitectura.

- **Por qué**:
  - fx es un **harness** (capa agente: razonamiento→tools→edición); Netrunner es un **motor de conexión** (capa contrato/vistas). Son **capas ortogonales y complementarias** — no compiten.
  - fx implementa **ACP nativamente** (`fx acp`, protocolo v1), por lo que es un **target de conexión natural**: Netrunner emite `{"command":"<abs>/fx","args":["acp"]}` + `mcpServers`. fx es **consumidor del output de Netrunner** (skills/MCP/Agent Plugins 1.0).
  - El patrón minimalismo de fx (binario único 7.8 MiB) **confirma** que el binario standalone de Netrunner (`bun build --compile`) es el enfoque correcto.
  - NO adoptar el WASM de fx: no aporta capacidad nueva (Netrunner ya logra embeddability con Bun + bytecode + SQLite nativo) y añadiría toolchain Zig 0.16 + JSPI + superficie WASM recortada.

- **Alternativas rechazadas**:
  - *fx como harness interno/runtime* → contradice "harness ≠ compute" y "motor = orquestador, no harness" (DEC-001/002). Rechazado.
  - *Adoptar el WASM de fx (createFxAgent)* → no aporta, añade toolchain ajena. Rechazado.

- **Riesgos a vigilar**:
  - fx es Experimental → **pinear versión** en la config ACP si se fija como target.
  - El ACP de fx es protocolo **v1** → el emisor de Netrunner debe versionar protocolo ACP, no asumir v2 en todos los targets.

- **Spec/Gherkin relacionado**: spec.md (AC-7 conectar agentes). Reporte completo en `.doc/auditoria/20260820_123114_validacion-fx.txt` (gitignored).
