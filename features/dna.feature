# Gherkin — ADN de diseño determinista: netrunner dna <url> (Wave J2 + K2)

## SPEC (Mandamiento 0)

**Como** un agente que estudia webs para aprender cómo otros diseñaron,
**quiero** que `netrunner dna <url>` extraiga el ADN de diseño de una web (colores/tipografía/spacing/radius/shadows) normalizado a roles semánticos + escaneo booleano de efectos,
**para** que pueda estudiar el diseño system de cualquier página de forma determinista (sin LLM en el núcleo) y producir un brief para un agente de diseño.

Sin browser como dependencia dura (fetch HTML+CSS primero — respeta 'single standalone binary T0'). Módulo `src/dna/index.ts`. `--render` (shellea a chromium) queda para el padre; acá solo el escaneo determinista.

## Wave K2 — mejoras investigador profundo (papers 2601.19117, DTCG W3C)

**Como** un agente que estudia webs,
**quiero** roles de color perceptivos (OKLab, no RGB) ponderados por área×frecuencia + posición CTA, type scale por regresión log-lineal, spacing off-system, y emisores DTCG W3C,
**para** que el ADN de diseño sea perceptivamente correcto (k-means OKLab — paper 2601.19117) y consumible por herramientas estándar (DTCG).

## Acceptance Criteria

### AC-1 — scan determinista
- **AC-1.1**: `dnaScan(url, fetcher)` devuelve un `DnaResult` con la URL + dimensiones (colors/typography/spacing/radius/shadows/effects). Sin LLM, sin aleatoriedad — mismo input → mismo output.

### AC-2 — colores
- **AC-2.1**: extrae colores del CSS inline y atributos `style`, normaliza a hex (formato/case), dedupe y cuenta frecuencia.
- **AC-2.2**: asigna roles semánticos: `primary` (cluster OKLab no-neutral de mayor peso excluyendo accent), `accent` (CTA: button/a con bg != surface, primeros en DOM), escala `neutral` (grises ordenados), `semantic` (desde custom props success/error/warning/info).
- **AC-K2-2.3**: clusteriza colores en espacio OKLab (perceptivo, no RGB); expone `colors.clusters` (centro + hexes + peso).
- **AC-K2-2.4**: pondera clusters por frecuencia×área (área proxy = presencia en elementos grandes/CTA).

### AC-3 — tipografía
- **AC-3.1**: extrae font-families (dedupe) y un type scale (h1..h6/body): family + size/weight/line-height por selector.
- **AC-K2-3.2**: type scale por regresión log-lineal `ln(size) vs step` → `ratio = exp(slope)`; si `R² > 0.95` → `mode='modular'`, si no `mode='custom'`; <2 puntos → `'single'`.

### AC-4 — spacing
- **AC-4.1**: recolecta paddings/margins/gaps en px y calcula el GCD → `base_unit`.
- **AC-K2-4.2**: marca `spacing.offSystem` = valores que no caen en el grid dominante (múltiplos del GCD mayoritario).

### AC-5 — radius
- **AC-5.1**: recolecta valores de `border-radius` (dedupe/cluster por px).

### AC-6 — shadows
- **AC-6.1**: recolecta valores de `box-shadow`.

### AC-7 — efectos
- **AC-7.1**: escaneo booleano de `<canvas>`, WebGL, GSAP y Three.js.

### AC-K2-8 — emisores DTCG W3C
- **AC-K2-8.1**: `emitDesignTokensJson(dna)` → design-tokens.json válido (JSON parseable) con `$type`/`$value`, capas `primitivo`/`semantico`/`composite`, y referencias `{...}`.
- **AC-K2-8.2**: `emitVariablesCss(dna)` → `variables.css` con `:root` + `--css` vars.
- **AC-K2-8.3**: `emitDesignMd(dna)` → brief markdown para agentes de diseño.

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
    Then  colors.primary = cluster OKLab no-neutral de mayor peso (excluye accent)
    And   colors.accent = color de button/a con bg != surface, primero en DOM
    And   colors.neutral incluye los grises
    And   colors.semantic mapea success/error/warning/info

  Scenario: cluster OKLab perceptivo (AC-K2-2.3)
    Given dos azules perceptivamente cercanos y un rojo
    When  clusterOklab(hexes)
    Then  agrupa los azules juntos y separa el rojo

  Scenario: type scale modular (AC-K2-3.2)
    Given body/h1/h2 en progresión geométrica (ratio constante)
    When  dnaScan
    Then  typography.typeScaleAnalysis.mode = 'modular'
    And   ratio ≈ ratio geométrico, R² > 0.95

  Scenario: type scale custom (AC-K2-3.2)
    Given sizes no lineales en ln
    When  dnaScan
    Then  typography.typeScaleAnalysis.mode = 'custom'

  Scenario: spacing base_unit + off-system (AC-K2-4.2)
    Given paddings 8/16/24/30 px
    When  dnaScan
    Then  spacing.baseUnit = gcd
    And   spacing.offSystem incluye los valores fuera del grid dominante

  Scenario: emisores DTCG W3C (AC-K2-8)
    Given un DnaResult
    When  emitDesignTokensJson / emitVariablesCss / emitDesignMd
    Then  design-tokens.json parsea con $type/$value/capas/refs
    And   variables.css tiene :root y --vars
    And   design.md es un brief markdown
```
