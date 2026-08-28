# Gherkin — netrunner extract <url> (Wave J1)

## SPEC (Mandamiento 0)
**Como** un agente que estudia cómo otros crearon (estructura, stack, contenido de una web)
**quiero** que `netrunner extract <url>` devuelva el contenido en Markdown listo para LLM,
junto con metadata, el stack/framework detectado y los links de la página,
**para** estudiar cómo otros crearon sin robar — y sin LLM en el núcleo ni browser como dependencia dura.

Determinista, sin browser de dependencia dura (fetch HTML+CSS primero). Firecrawl self-hosted
vía DI con fallback a fetch plano (fundamento I3/Scrapling).

## Acceptance Criteria
- **AC-E1**: `extractWeb(url)` devuelve `{ markdown, metadata, stack, links }`; `markdown` no vacío.
- **AC-E2**: el motor Firecrawl se inyecta por DI (`new FirecrawlFetcher(api)`); si falla/está ausente, cae a `fetch` plano.
- **AC-E3**: `sanitizeHtml` remueve contenido oculto (hidden/display:none/aria-hidden) y contenido no-visible.
- **AC-E4**: `sanitizeMarkdown` neutraliza prompt-injection: remueve texto con `ignore previous instructions`, `system prompt`, y atributos `on*` / `javascript:` de los links.
- **AC-E5**: `detectStackFromHtml(html, metadata)` detecta framework/CMS por meta generator, class hints, y links de assets (next/astro/wordpress/astro/webflow/wix/ghost/gatsby).
- **AC-E6**: `robots` respeta robots.txt y meta robots: si `Disallow` cubre la URL o el meta dice `noindex`/`nofollow`, `extractWeb` NO extrae (devuelve `{ blocked: true }`).
- **AC-E7**: un HTML con meta generator y assets detecta el stack correctamente.
- **AC-E8**: cada archivo de `src/web/` tiene < 200 líneas.

## Escenarios
```
Feature: netrunner extract <url> (Wave J1)

  Scenario: extrae markdown + metadata + stack + links de una web
    Given una URL con HTML conteniendo un <title> y un párrafo visible
    When llamo extractWeb(url, { fetcher })
    Then markdown no está vacío
    And metadata.title es el del <title>
    And stack no está vacío
    And links contiene al menos el href de un ancla

  Scenario: Firecrawl se inyecta por DI y cae a fetch si falla
    Given un FirecrawlFetcher mock que lanza
    When llamo extractWeb(url, { fetcher })
    Then se usa el fetch plano como fallback y markdown no está vacío

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
    Given un fetcher mock que responde Disallow para la URL
    When llamo extractWeb
    Then devuelve blocked: true y markdown vacío
```
