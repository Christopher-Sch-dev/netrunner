# Gherkin — net_run: ejecutar cualquier comando CLI como tool MCP (P7.1)

## SPEC (Mandamiento 0)
**Como** un agente que usa NetRunner como MCP server,
**quiero** poder ejecutar CUALQUIER comando CLI de NetRunner como tool MCP,
**para** controlar todo el motor por flujo agéntico (no solo el grafo).

## AC
- AC-1 `net_run <command> <args>` ejecuta el comando CLI del binario (spawn).
- AC-2 Allowlist de comandos seguros (read-only + no destructivos): status, explore, callers, callees, impact, path, god-nodes, graph-report, plan, guard, policy, persist, rollback, snapshot, resume, sleeve, history, curate, lint, extract, dna, inspect, stack, map, depth, scan, mesh, dump, doctor, deck, mode, quickhacks, breach, mcp-orchestrate.
- AC-3 Comando NO en allowlist → error estructurado (no ejecuta).
- AC-4 Args vacíos → error MISSING_COMMAND.
- AC-5 Output JSON parseable (el agente lo entiende).
- AC-6 Idempotente: ejecutar el mismo comando 2 veces da el mismo resultado (para read-only).
