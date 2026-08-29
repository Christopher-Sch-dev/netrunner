# Gherkin — MCP de 0 a 100: net_init + net_cascade

## SPEC (Mandamiento 0)
**Como** un agente que usa NetRunner como MCP server,
**quiero** poder crear/inicializar un proyecto y ejecutar una cascada completa de tools
**para** que el MCP funcione de 0 a 100 (no solo consultar un proyecto ya indexado).

## AC
- **AC-1** `net_init <dir>` inicializa un proyecto (indexa el grafo + genera conectable layer: SKILL.md/AGENTS.md/program.md/.mcp.json). Idempotente.
- **AC-2** `net_init` con dir inválido → error estructurado (INVALID_DIR).
- **AC-3** `net_cascade <dir> <steps>` ejecuta una cascada designada de tools en orden (ej: `init,status,explore,plan,ops`), síncrona, en cascada lógica (cada paso usa el resultado del anterior).
- **AC-4** `net_cascade` con steps vacíos → error (MISSING_STEPS).
- **AC-5** `net_cascade` con un step desconocido → error (UNKNOWN_STEP), no ejecuta nada.
- **AC-6** `net_cascade` devuelve los resultados de cada paso en orden (JSON estable, exit 0).
- **AC-7** `net_cascade` no satura servicios: ejecuta los steps en secuencia (síncrono), no en paralelo.
