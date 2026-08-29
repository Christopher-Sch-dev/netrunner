# Gherkin — gate SkillOpt: aceptar skill solo si mejora estrictamente (held-out)

## SPEC (Mandamiento 0)
**Como** el motor de auto-mejora de NetRunner,
**quiero** aceptar un Memento-Skill solo si mejora estrictamente un score de validación held-out (y no está en el buffer de rechazo),
**para** que la auto-mejora sea estable y no propague skills que no mejoran (fundamento SkillOpt, arXiv 2605.23904).

## AC (Acceptance Criteria)
- **AC-1** `shouldUpsertSkillOpt(obs, heldOutScore, prevScore)` → true solo si `heldOutScore > prevScore` (mejora estricta) Y `obs.ok` Y `obs.veces >= threshold`.
- **AC-2** Si `heldOutScore <= prevScore` (no mejora o empeora) → false (rechaza).
- **AC-3** Si el skill está en el buffer de rechazo → false (no reintenta el mismo edit).
- **AC-4** `addToRejectBuffer(skill, score)` agrega al buffer (para no reintentar edits que no mejoraron).
- **AC-5** `isInRejectBuffer(skill)` → true si el skill fue rechazado antes.
- **AC-6** Default threshold 3 (consistente con el gate Memento existente).

## Escenarios
### Escenario 1: mejora estricta → acepta
- **Given** un Memento con `ok:true`, `veces:3`, score held-out 0.8 y prevScore 0.6
- **When** se evalúa `shouldUpsertSkillOpt`
- **Then** devuelve true (0.8 > 0.6, mejora estricta)

### Escenario 2: no mejora → rechaza
- **Given** un Memento con score held-out 0.6 y prevScore 0.8
- **When** se evalúa `shouldUpsertSkillOpt`
- **Then** devuelve false (0.6 <= 0.8, no mejora)

### Escenario 3: en buffer de rechazo → rechaza
- **Given** un skill que fue rechazado antes (en el buffer)
- **When** se evalúa `shouldUpsertSkillOpt`
- **Then** devuelve false (no reintenta)
