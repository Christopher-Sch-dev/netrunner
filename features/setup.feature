# Gherkin — setup: instalador agéntico un-comando

## SPEC (Mandamiento 0)
**Como** un agente que quiere usar NetRunner en su máquina,
**quiero** ejecutar `netrunner setup` para instalar y configurar el motor agénticamente,
**para** que NetRunner quede funcional y conectado a mis sistemas agénticos con un solo comando.

## AC
- **AC-1** detecta plataforma (OS/arch) y agentes presentes.
- **AC-2** instala los sistemas agénticos en orden de prioridad: opencode → hermes → claude → codex (solo los detectados).
- **AC-3** genera el conectable layer (init) en el directorio actual.
- **AC-4** verifica con doctor y reporta `ok:true` solo si el binario responde.
- **AC-5** idempotente (re-correr no duplica).
- **AC-6** registra estado en `~/.netrunner/state.json`.

## GHERKIN
- GIVEN un sistema con opencode presente,
- WHEN ejecuto netrunner setup,
- THEN configura opencode primero (orden de prioridad), luego los demás detectados, e informa ok:true.
