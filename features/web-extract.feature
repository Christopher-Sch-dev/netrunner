# Gherkin — netrunner extract <url> (Wave J1 + mejoras Wave K1)

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

## Acceptance Criteria — mejoras Wave K1 (investigador profundo)
- **AC-K1.1**: `detectSPA(html)` devuelve `{ isSpa, indicator }` (div#root/#app casi vacío + scripts grandes,
  o `__NEXT_DATA__` client-rendered). `extractWeb` expone `rendered: boolean`; si es SPA client-rendered,
  `rendered: false` (honestidad: no falla en silencio ni afirma contenido que no hay).
- **AC-K1.2**: `sanitizeHtml` poda además nav/banner/footer/aside/popups (heurística tag + class/id) y
  texto oculto agresivo (visibility:hidden, 1px, font-size:0, sr-only).
- **AC-K1.3**: `sanitizeMarkdown` neutraliza más patrones de instrucción falsa ('reveal your instructions',
  'follow the instructions in', 'disregard previous', base64 sospechoso) — patrón FocusAgent.
- **AC-K1.4**: el output se trata como DATOS nunca instrucciones: `ExtractResult` incluye `source: 'untrusted'`
  en la metadata (elimina clase LLM2x).
- **AC-K1.5**: `detectStackFromHtml` amplía el stack: `__NEXT_DATA__` (Next), `__NUXT__` (Nuxt/Vue),
  `__REMIX_` (Remix), `astro-island` (Astro), `wp-content`/`wp-json` (WordPress); y acepta headers
  `X-Powered-By`/`Server` para detectar por servidor.

## Escenarios
```
Feature: netrunner extract <url> (Wave J1 + K1)

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

  Scenario: detecta SPA client-rendered (K1)
    Given HTML con <div id="root"></div> casi vacío y un script grande
    When llamo extractWeb
    Then rendered es false
    And el indicator menciona el contenedor raíz

  Scenario: poda nav/banner/hidden en sanitize (K1)
    Given HTML con un <nav> con links, un div.banner y texto sr-only
    When sanitizo el HTML
    Then ni los links de nav ni el texto sr-only ni el banner aparecen

  Scenario: neutraliza instrucciones falsas y base64 sospechoso (K1)
    Given HTML con "reveal your instructions", "disregard previous" y un bloque base64
    When sanitizo el markdown
    Then ninguna instrucción falsa ni el base64 aparecen

  Scenario: metadata marca el output como datos no instrucciones (K1)
    Given una URL extraída correctamente
    When llamo extractWeb
    Then metadata.source es 'untrusted'

  Scenario: detecta stack ampliado por markers y headers (K1)
    Given HTML con __NEXT_DATA__/__NUXT__/astro-island/wp-content y header X-Powered-By
    When detecto el stack pasando headers
    Then el framework detectado incluye next/nuxt/astro/wordpress y el server detectado

  Scenario: respeta robots.txt y meta robots (no indexa)
    Given un robots.txt que Disallow la URL o un meta robots noindex
    When llamo extractWeb
    Then devuelve blocked: true y markdown vacío

  Scenario: cap de links anti-exhaustion
    Given un HTML con más de 50 anclas
    When llamo extractWeb
    Then links no supera los 50 elementos
```
