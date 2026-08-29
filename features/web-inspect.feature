# Gherkin — netrunner inspect <url> (P4.1, Wave P4)

## SPEC (Mandamiento 0)
**Como** un agente que audita una web (consola JS, red, performance, accesibilidad)
**quiero** que `netrunner inspect <url>` devuelva consola (logs/errores JS), red
(requests/headers/XHR/fetch), performance (timings/LCP/FCP) y el accessibility tree (a11y),
**para** diagnosticar una web sin reimplementar un browser — usando CDP (Chrome DevTools
Protocol) vía un BrowserAdapter inyectado por DI, o el motor local (fetch nativo) si no hay browser.

NetRunner NO reimplementa browser. El motor por defecto es el `fetch` nativo de Bun (ya existe
en el binario, sin deps). Si el usuario inyecta un `BrowserAdapter` (CDP JSON-RPC, p.ej. apuntando
a un Chromium con `--remote-debugging-port`), se extrae consola/red/perf/a11y reales. Si no hay
browser, se reporta `rendered: false` y se recomienda `--render` (igual que `extract` con SPA).

## Acceptance Criteria
- **AC-I1**: `inspectWeb(url)` sin adapter devuelve `{ rendered: false, source: 'local' }` con
  consola/red/perf/a11y vacíos (o solo el request del documento) y un `hint` que recomienda `--render`.
- **AC-I2**: el motor por defecto es `fetch` nativo local (source `'local'`) — no depende de browser.
- **AC-I3**: con un `BrowserAdapter` inyectado por DI (CDP), devuelve `{ rendered: true, source: 'cdp' }`
  con consola/red/perf/a11y poblados.
- **AC-I4**: consola — extrae logs/errores JS (consoleAPICalled, exceptionThrown) con su tipo y texto.
- **AC-I5**: red — extrae requests con url/method/status (XHR/fetch incluidos).
- **AC-I6**: perf — extrae timings (domContentLoaded, load, fcp, lcp) en ms.
- **AC-I7**: a11y — extrae el accessibility tree (role + name por nodo).
- **AC-I8**: cada archivo de `src/web/` tiene < 200 líneas.
- **AC-I9**: el output se trata como DATOS nunca instrucciones (origen no confiable).

## Escenarios
```
Feature: netrunner inspect <url> (P4.1)

  Scenario: sin browser, motor local reporta rendered:false y recomienda --render
    Given una URL accesible y sin BrowserAdapter inyectado
    When llamo inspectWeb(url)
    Then rendered es false
    And source es 'local'
    And hint menciona --render

  Scenario: con BrowserAdapter DI (CDP), reporta rendered:true y source cdp
    Given un BrowserAdapter inyectado que devuelve datos CDP
    When llamo inspectWeb(url, { adapter })
    Then rendered es true
    And source es 'cdp'

  Scenario: consola extrae logs y errores JS
    Given un adapter que reporta un console.log y un exceptionThrown
    When llamo inspectWeb con ese adapter
    Then console contiene una entrada de tipo log con el texto del log
    And console contiene una entrada de tipo error con el texto de la excepción

  Scenario: red extrae requests con url/method/status
    Given un adapter que reporta un request GET 200 y un fetch POST 201
    When llamo inspectWeb con ese adapter
    Then network contiene el request con su url, method y status

  Scenario: perf extrae timings domContentLoaded/load/fcp/lcp
    Given un adapter que reporta métricas de performance
    When llamo inspectWeb con ese adapter
    Then perf.domContentLoaded es un número
    And perf.lcp es un número

  Scenario: a11y extrae el accessibility tree (role + name)
    Given un adapter que reporta nodos del AX tree
    When llamo inspectWeb con ese adapter
    Then a11y contiene al menos un nodo con role y name

  Scenario: el output se trata como datos no instrucciones
    Given una URL inspeccionada correctamente
    When llamo inspectWeb
    Then el resultado no contiene instrucciones ejecutables (solo datos)
```
