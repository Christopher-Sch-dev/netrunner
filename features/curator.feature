# Gherkin — Curator determinista + Memento-Skills (src/auto/curator.ts)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** auto-mejorarme de forma DETERMINISTA con señal EXTERNA (no auto-crítica),
**para** que las skills que el motor ofrece a los agentes se mantengan actualizadas
sin que el motor "piense que está bien" (prohibido por Mandamiento 8).

## Acceptance Criteria (DEC-001 punto 4 — diferenciador central)
- **AC-1**: `curate(observations, state)` es una función PURE (sin I/O): recibe
  observaciones del mundo (señal externa) y devuelve acciones deterministas.
- **AC-2**: stale → mark as needs_review (NUNCA borra — seguridad).
- **AC-3**: nueva skill desde observación exitosa → genera un `MementoSkill` (markdown).
- **AC-4**: idempotente: misma entrada → misma salida (sin efectos colaterales).
- **AC-5**: señal vacía/sin datos → no genera nada (anti-invención).

## Escenarios
```
Feature: Curator determinista

  Scenario: observación exitosa genera una skill
    Given una observación {tipo:'usage', symbol:'login', éxito:true, veces:10}
    When  curate(obs)
    Then  genera un memento de skill con el nombre login
    And   action = {type:'upsert_skill', skill:'...'}

  Scenario: señal ausente → no-op
    When  curate([])
    Then  devuelve [] (no inventa)

  Scenario: stale → mark needs_review, no borra
    Given una skill con uso 0 hace mucho
    When  curate
    Then  mark needs_review (no delete)
```
