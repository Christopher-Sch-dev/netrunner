# Gherkin — ADN de diseño determinista: netrunner dna <url> (Wave J2)

## SPEC (Mandamiento 0)

**Como** un agente que estudia webs para aprender cómo otros diseñaron,
**quiero** que `netrunner dna <url>` extraiga el ADN de diseño de una web (colores/tipografía/spacing/radius/shadows) normalizado a roles semánticos + escaneo booleano de efectos,
**para** que pueda estudiar el diseño system de cualquier página de forma determinista (sin LLM en el núcleo) y producir un brief para un agente de diseño.

Sin browser como dependencia dura (fetch HTML+CSS primero — respeta 'single standalone binary T0'). Módulo `src/dna/index.ts`. `--render` (shellea a chromium) queda para el padre; acá solo el escaneo determinista.

## Acceptance Criteria

### AC-1 — scan determinista
- **AC-1.1**: `dnaScan(url, fetcher)` devuelve un `DnaResult` con la URL + dimensiones (colors/typography/spacing/radius/shadows/effects). Sin LLM, sin aleatoriedad — mismo input → mismo output.

### AC-2 — colores
- **AC-2.1**: extrae colores del CSS inline y atributos `style`, normaliza a hex (formato/case), dedupe y cuenta frecuencia.
- **AC-2.2**: asigna roles semánticos: `primary` (color no-neutro más frecuente), `accent` (el de botones/CTA si existe), escala `neutral` (grises ordenados), `semantic` (desde custom props success/error/warning/info).

### AC-3 — tipografía
- **AC-3.1**: extrae font-families (dedupe) y un type scale (h1..h6/body): family + size/weight/line-height por selector.

### AC-4 — spacing
- **AC-4.1**: recolecta paddings/margins/gaps en px y calcula el GCD → `base_unit`.

### AC-5 — radius
- **AC-5.1**: recolecta valores de `border-radius` (dedupe/cluster por px).

### AC-6 — shadows
- **AC-6.1**: recolecta valores de `box-shadow`.

### AC-7 — efectos
- **AC-7.1**: escaneo booleano de `<canvas>`, WebGL, GSAP y Three.js.

## Escenarios
```
Feature: netrunner dna <url>

  Scenario: escaneo determinista (AC-1)
    Given un HTML con CSS inline de una web
    When  dnaScan(url, fetcher)
    Then  devuelve DnaResult con url y todas las dimensiones

  Scenario: roles de color (AC-2)
    Given CSS con primary/accent/neutrals/semantic custom props
    When  dnaScan
    Then  colors.primary = hex del color no-neutro más frecuente
    And   colors.accent = hex de botones/CTA
    And   colors.neutral incluye los grises
    And   colors.semantic mapea success/error/warning/info

  Scenario: tipografía (AC-3)
    Given CSS con font-family + sizes/weights/line-heights en h1/body
    When  dnaScan
    Then  typography.families incluye la fuente
    And   typography.typeScale incluye h1 y body con sus valores

  Scenario: spacing base_unit (AC-4)
    Given paddings/margins/gaps de 8/16/24px
    When  dnaScan
    Then  spacing.baseUnit = 8

  Scenario: radius (AC-5)
    Given border-radius de 8px y 16px
    When  dnaScan
    Then  radius.values incluye 8 y 16 deduplicados

  Scenario: shadows (AC-6)
    Given un box-shadow definido
    When  dnaScan
    Then  shadows incluye el valor

  Scenario: efectos (AC-7)
    Given un HTML con <canvas>
    When  dnaScan
    Then  effects.canvas = true
```
