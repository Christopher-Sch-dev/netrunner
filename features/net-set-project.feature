# Gherkin — net_set_project: cambiar el proyecto en runtime (MCP)

## SPEC (Mandamiento 0)
**Como** un agente que usa NetRunner como MCP server,
**quiero** cambiar el proyecto que opera en runtime (sin reiniciar el server),
**para** navegar CUALQUIER repo TS/JS con las tools del grafo (net_explore/net_callers/net_impact), no solo el cwd de arranque.

## AC (Acceptance Criteria)
- **AC-1** `net_set_project <dir>` valida que el dir exista y sea un directorio.
- **AC-2** Si el dir es inválido (no existe / no es dir) → error estructurado, no cambia nada.
- **AC-3** Si el dir es válido → actualiza el projectDir del contexto; las tools posteriores (net_explore/net_callers/net_impact) operan sobre el nuevo proyecto.
- **AC-4** Devuelve JSON con el nuevo projectDir + stack detectado.
- **AC-5** Idempotente: setear el mismo dir no rompe nada.

## Escenarios
### Escenario 1: cambiar a un repo válido
- **Given** un MCP server netrunner arrancado con projectDir A
- **When** el agente llama `net_set_project` con un dir B válido (repo TS/JS)
- **Then** el projectDir pasa a B
- **And** `net_explore` posterior opera sobre B

### Escenario 2: dir inválido
- **Given** un MCP server netrunner
- **When** el agente llama `net_set_project` con un dir que no existe
- **Then** devuelve error estructurado
- **And** el projectDir NO cambia (sigue en A)
