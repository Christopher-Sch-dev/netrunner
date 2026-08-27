# Gherkin — watchdog-event: file watcher real (event-driven, sin polling)

## SPEC (Mandamiento 0)
**Como** el motor Netrunner,
**quiero** que el watchdog use un file watcher real (fs.watch recursivo) que emita la señal `cambio` en el momento en que un archivo cambia,
**para** que la memoria viva se mantenga en TIEMPO REAL (el agente se entera del cambio sin polling ni consulta — gap señalado por Cris: "necesidades para que la herramienta funcione siempre se actualice").

## Acceptance Criteria
- **AC-1**: `watchProject(projectDir, opts)` inicia un file watcher real (fs.watch recursivo) sobre el proyecto.
- **AC-2**: al cambiar un archivo → emite señal `cambio` (via hooks) en tiempo real (no polling).
- **AC-3**: ignora ruido (`node_modules`, `.git`, `.netrunner`, `dist`, `build`, `coverage`).
- **AC-4**: debounce — una ráfaga de eventos (un write) emite UNA señal, no N.
- **AC-5**: `close()` detiene el watcher (no emite más señales).
- **AC-6**: `watchdogCheck` (mtime-polling) se conserva para compatibilidad con el daemon.

## Escenarios
```
Feature: watchdog-event (file watcher real)

  Scenario: cambio real emite señal en tiempo real
    Given un proyecto con un archivo
    When  watchProject inicia y se modifica el archivo
    Then  emite señal 'cambio' (sin polling)

  Scenario: ignora ruido
    Given un proyecto
    When  cambia un archivo en node_modules
    Then  no emite señal

  Scenario: debounce
    Given un proyecto
    When  se escriben varios eventos en ráfaga
    Then  emite UNA señal 'cambio'

  Scenario: close detiene
    Given un proyecto
    When  watchProject y luego close()
    Then  no emite más señales
```
