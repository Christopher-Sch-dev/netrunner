### DEC-006 — Formato de instalación: Agent Skills (SKILL.md) + wiring MCP (plug-and-play)

- **Fecha**: 2026-08-26
- **Decisión** (Given/When/Then):

  **GIVEN** Netrunner es un binario que un proyecto debe poder instalar para que
  CUALQUIER agente (Claude/Codex/Hermes/OpenCode/Cursor/Gemini) lo entienda y opere,
  y las auditorías validaron que la capa de *contenido* portable de agentes es
  **Agent Skills** (formato `SKILL.md`, adoptado por 30-40 plataformas — agentskills.io)
  mientras que la capa de *contrato de tools* es **MCP** (modelcontextprotocol.io),
  **WHEN** defino el formato en que `netrunner install` deja el motor en un proyecto,
  **THEN** elijo **Agent Skills (`SKILL.md`) como formato de instalación + wiring de
  `mcpServers`**, no un "Agent Plugin" monolítico ni una SLI custom.

#### Por qué (evidencia)
1. **Agent Skills (`SKILL.md`)** es el estándar de contenido portable de agentes: ~100
   tokens de metadata, progressive disclosure, adoptado por Claude/Codex/Cursor/OpenCode/
   Snowflake. Es el "cómo" el agente *aprende* a usar el motor. (agentskills.io)
2. **MCP** es el contrato de tools: el mismo binario ya expone `serveMCP` (Wave 2). Al
   instalar, se escribe `mcpServers` para que el agente conecte el contrato de tools.
3. **Agent Plugins** (plugin.json) es un *manifest de paquete* (hooks, skills, mcpServers),
   útil para la DISTRIBUCIÓN, pero no el formato mínimo de instalación en un proyecto.
4. **SLI (skill) custom** duplicaría lo que SKILL.md ya estandariza.

#### Qué instala `netrunner install` en un proyecto
- `.netrunner/` (index.db) — ya existe (grafo).
- `.netrunner/skills/netrunner/SKILL.md` — describe cómo usar el motor (Agent Skills format).
- `.mcp.json` (o `opencode.json` / `.claude/settings.json` según target) — registra `netrunner --mcp` como server MCP.
- Así el agente: (1) lee la skill para *entender* qué puede operar, (2) conecta MCP para *ejecutar* tools.

#### Alternativas rechazadas
- **Agent Plugin monolíquico** → no es formato mínimo; complica el "plug-and-play" en cualquier proyecto.
- **SLI custom** → duplica SKILL.md estándar.

#### Veredicto
`install` = escribe SKILL.md (formato Agent Skills) + wiring `mcpServers` per target. El binario queda
instalable en el proyecto Y controlable por el agente (lo que Cris pidió).
