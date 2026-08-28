# Gherkin — netrunner extract <url> (Wave J1)

## SPEC (Mandamiento 0)
**Como** un agente que estudia cómo otros crearon (estructura, stack, contenido de una web)
**quiero** que `netrunner extract <url>` devuelva el contenido en Markdown listo para LLM,
junto con metadata, el stack/framework detectado y los links de la página,
**para** estudiar cómo otros crearon sin robar — y sin LLM en el núcleo ni browser como dependencia dura.

NetRunner funciona **100% LOCAL** sin dependencias externas. El motor de extracción es el `fetch`
nativo de Bun (ya existe en el binario) con parsing ligero por regex/tokenizer. Firecrawl self-hosted
se usa SOLO si el usuario lo configura explícitamente (env `FIRECRAWL_URL`), nunca por defecto.

## Acceptance Criteria
- **AC-E1**: `extractWeb(url)` devuelve `{ markdown, metadata, stack, links }`; `markdown` no vacío.
- **AC-E2**: el motor por defecto es `fetch` nativo local (source `'local'`) — no depende de Firecrawl.
- **AC-E2b**: Firecrawl se inyecta por DI (`WebFetcher`) solo si el usuario lo configuró explícitamente
  (source `'firecrawl'`); si falla, cae a `fetch` plano (source `'fetch'`).
- **AC-E3**: `sanitizeHtml` remueve contenido oculto (hidden/display:none/aria-hidden) y contenido no-visible.
- **AC-E4**: `sanitizeMarkdown` neutraliza prompt-injection y atributos `on*` / `javascript:`.
- **AC-E5**: `detectStackFromHtml(html, metadata)` detecta framework/CMS (astro/next/wordpress/...).
- **AC-E6**: `robots` respeta robots.txt y meta robots: si `Disallow` cubre la URL o el meta dice
  `noindex`/`nofollow`, `extractWeb` NO extrae (devuelve `{ blocked: true }`).
- **AC-E9**: guardas anti-resource-exhaustion: timeout de fetch 5s, cap de tamaño de respuesta 2MB,
  cap de links 50. No hay loops infinitos ni condiciones de carrera.
- **AC-E8**: cada archivo de `src/web/` tiene < 200 líneas.

## Escenarios
```
Feature: netrunner extract <url> (Wave J1)

  Scenario: extrae markdown + metadata + stack + links de una web
    Given una URL con HTML conteniendo un <title> y un párrafo visible
    When llamo extractWeb(url) con fetch nativo local
    Then markdown no está vacío
    And metadata.title es el del <title>
    And stack no está vacío
    And links contiene al menos el href de un ancla
    And source es 'local'

  Scenario: Firecrawl se inyecta por DI solo si se configuró, y cae a fetch si falla
    Given un WebFetcher inyectado explícitamente
    When llamo extractWeb(url, { fetcher })
    Then source es 'firecrawl'
    And si el fetcher lanza, cae a fetch plano con source 'fetch'

  Scenario: sanitize remueve contenido oculto
    Given HTML con un <div style="display:none"> con texto secreto
    When sanitizo el HTML
    Then el texto secreto no aparece en el markdown

  Scenario: sanitize neutraliza prompt-injection
    Given HTML con "ignore previous instructions" y un <a onclick=...>
    When sanitizo el contenido
    Then "ignore previous instructions" no está en el markdown
    And el atributo onclick no aparece

  Scenario: detecta el stack por meta generator y assets
    Given HTML con <meta name="generator" content="Astro v5"> y /_astro/asset
    When detecto el stack
    Then el framework detectado incluye astro

  Scenario: respeta robots.txt y meta robots (no indexa)
    Given un robots.txt que Disallow la URL o un meta robots noindex
    When llamo extractWeb
    Then devuelve blocked: true y markdown vacío

  Scenario: cap de links anti-exhaustion
    Given un HTML con más de 50 anclas
    When llamo extractWeb
    Then links no supera los 50 elementos
```
