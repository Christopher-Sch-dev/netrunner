# Gherkin — Detector de servicios (src/context/services.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto Netrunner,
**quiero** conocer los servicios conectados (frontend/backend/urls/puertos),
**para** que la skill auto-generante documente si el proyecto está conectado a
servicios de infraestructura (la feature de servicios).
infraestructura").

## Acceptance Criteria (Wave 6 — skill auto-generante)
- **AC-1**: `servicesInfo(projectDir)` devuelve { services: Array<{ name, port, url }> }.
- **AC-2**: detecta puertos/urls de `package.json` scripts (dev/start) y `docker-compose.yml`.
- **AC-3**: PURE/determinista: si no hay servicios → { services: [] } (no falla).
- **AC-4**: cada servicio tiene name, port (si aplica) y url.

## Escenarios
```
Feature: Detector de servicios

  Scenario: package.json con script dev que expone puerto
    Given package.json con scripts.dev = "vite --port 5173"
    When  servicesInfo(dir)
    Then  services incluye { name: 'dev', port: 5173 }

  Scenario: sin servicios
    Then  { services: [] } (no falla)
```
