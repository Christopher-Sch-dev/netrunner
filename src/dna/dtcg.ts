// rol: dtcg — emisores DTCG W3C (design-tokens.json + variables.css + design.md).
// Estándar DTCG (Design Tokens Community Group, W3C): tokens con $type/$value,
// organizados en capas (primitivo/semantico/composite) y referencias {alias}
// a otros tokens. variables.css expone las mismas decisiones como --css vars;
// design.md es un brief markdown consumible por un agente de diseño.
// Sin dependencias (serialización manual).

/** rol: forma mínima del ADN necesaria para emitir (duplicado estructural, sin import circular). */
export interface DnaShape {
  url: string
  colors: {
    primary: string | null
    accent: string | null
    neutral: string[]
    semantic: Record<string, string>
  }
  typography: {
    families: string[]
    typeScale: Record<string, { size?: string; weight?: string; lineHeight?: string }>
  }
  spacing: { baseUnit: number | null; offSystem?: number[] }
  radius: { values: number[] }
  shadows: { values: string[] }
  effects: { canvas: boolean; webgl: boolean; gsap: boolean; three: boolean }
}

// rol: token DTCG básico con $type/$value (+ $description opcional).
function token(type: string, value: unknown, description?: string): Record<string, unknown> {
  const t: Record<string, unknown> = { $type: type, $value: value }
  if (description) t.$description = description
  return t
}

/** rol: emite design-tokens.json (string JSON válido) con capas y referencias {}. */
export function emitDesignTokensJson(dna: DnaShape): string {
  const primitivo: Record<string, unknown> = {}
  const semantico: Record<string, unknown> = {}
  const composite: Record<string, unknown> = {}

  // primitivo: valores de color, tipografía y espaciado sin significado semántico.
  if (dna.colors.primary) primitivo.color = token('color', { colorSpace: 'srgb', value: dna.colors.primary }, 'Primary color')
  if (dna.colors.accent) primitivo['color-accent'] = token('color', { colorSpace: 'srgb', value: dna.colors.accent }, 'Accent/CTA color')
  dna.colors.neutral.forEach((hex, i) => {
    primitivo[`neutral-${i + 1}`] = token('color', { colorSpace: 'srgb', value: hex }, 'Neutral surface/text')
  })
  for (const [name, hex] of Object.entries(dna.colors.semantic)) {
    primitivo[`semantic-${name}`] = token('color', { colorSpace: 'srgb', value: hex }, `Semantic ${name}`)
  }
  if (dna.spacing.baseUnit !== null) {
    primitivo['spacing-base'] = token('dimension', { value: dna.spacing.baseUnit, unit: 'px' }, 'Base unit (GCD)')
  }

  // semantico: tokens que referencian ({primitivo.…}) a decisiones de uso.
  if (dna.colors.primary) semantico['color.brand.primary'] = token('color', { colorSpace: 'srgb', value: '{primitivo.color}' }, 'Brand primary')
  if (dna.colors.accent) semantico['color.brand.accent'] = token('color', { colorSpace: 'srgb', value: '{primitivo.color-accent}' }, 'Brand accent/CTA')
  for (const [name, hex] of Object.entries(dna.colors.semantic)) {
    semantico[`color.feedback.${name}`] = token('color', { colorSpace: 'srgb', value: `{primitivo.semantic-${name}}` }, `Feedback ${name}`)
  }

  // composite: tokens compuestos (typography, shadow, radius).
  for (const [key, tk] of Object.entries(dna.typography.typeScale)) {
    composite[`typography.${key}`] = token('typography', { fontFamily: dna.typography.families[0] ?? null, fontSize: tk.size ?? null, fontWeight: tk.weight ?? null, lineHeight: tk.lineHeight ?? null }, `${key} type`)
  }
  if (dna.shadows.values.length) {
    composite['shadow.base'] = token('shadow', { value: dna.shadows.values[0] }, 'Base shadow')
  }
  dna.radius.values.forEach((v, i) => {
    composite[`radius.${i + 1}`] = token('dimension', { value: v, unit: 'px' }, `Radius ${v}px`)
  })

  return JSON.stringify(
    { $description: `Design tokens — ${dna.url}`, primitivo, semantico, composite },
    null,
    2,
  )
}

/** rol: emite variables.css con :root y --vars derivadas del ADN. */
export function emitVariablesCss(dna: DnaShape): string {
  const vars: string[] = []
  if (dna.colors.primary) vars.push(`  --color-primary: ${dna.colors.primary};`)
  if (dna.colors.accent) vars.push(`  --color-accent: ${dna.colors.accent};`)
  dna.colors.neutral.forEach((hex, i) => vars.push(`  --neutral-${i + 1}: ${hex};`))
  for (const [name, hex] of Object.entries(dna.colors.semantic)) vars.push(`  --semantic-${name}: ${hex};`)
  if (dna.spacing.baseUnit !== null) vars.push(`  --spacing-base: ${dna.spacing.baseUnit}px;`)
  for (const [key, tk] of Object.entries(dna.typography.typeScale)) {
    if (tk.size) vars.push(`  --font-size-${key}: ${tk.size};`)
    if (tk.weight) vars.push(`  --font-weight-${key}: ${tk.weight};`)
  }
  dna.radius.values.forEach((v, i) => vars.push(`  --radius-${i + 1}: ${v}px;`))
  return `:root {\n${vars.join('\n')}\n}\n`
}

/** rol: emite design.md — brief markdown para un agente de diseño. */
export function emitDesignMd(dna: DnaShape): string {
  const lines: string[] = []
  lines.push(`# ADN de diseño — ${dna.url}`)
  lines.push('')
  lines.push('Brief generado deterministamente (netrunner dna) para un agente de diseño.')
  lines.push('')
  lines.push('## Colores')
  lines.push('')
  if (dna.colors.primary) lines.push(`- **Primary**: \`${dna.colors.primary}\``)
  if (dna.colors.accent) lines.push(`- **Accent (CTA)**: \`${dna.colors.accent}\``)
  if (dna.colors.neutral.length) lines.push(`- **Neutral scale**: ${dna.colors.neutral.map((h) => `\`${h}\``).join(', ')}`)
  for (const [name, hex] of Object.entries(dna.colors.semantic)) lines.push(`- **Semantic ${name}**: \`${hex}\``)
  lines.push('')
  lines.push('## Tipografía')
  lines.push('')
  if (dna.typography.families.length) lines.push(`- **Families**: ${dna.typography.families.join(', ')}`)
  lines.push('')
  lines.push('| Token | Size | Weight | Line-height |')
  lines.push('|---|---|---|---|')
  for (const [key, tk] of Object.entries(dna.typography.typeScale)) {
    lines.push(`| ${key} | ${tk.size ?? '—'} | ${tk.weight ?? '—'} | ${tk.lineHeight ?? '—'} |`)
  }
  lines.push('')
  lines.push('## Espaciado')
  lines.push('')
  if (dna.spacing.baseUnit !== null) lines.push(`- **Base unit**: ${dna.spacing.baseUnit}px`)
  if (dna.spacing.offSystem?.length) lines.push(`- **Off-system**: ${dna.spacing.offSystem.join(', ')}px`)
  lines.push('')
  lines.push('## Radius / Shadow / Effects')
  lines.push('')
  if (dna.radius.values.length) lines.push(`- **Radius**: ${dna.radius.values.join(', ')}px`)
  if (dna.shadows.values.length) lines.push(`- **Shadow**: \`${dna.shadows.values[0]}\``)
  const fx = Object.entries(dna.effects).filter(([, v]) => v).map(([k]) => k)
  lines.push(`- **Effects**: ${fx.length ? fx.join(', ') : 'ninguno'}`)
  lines.push('')
  return lines.join('\n')
}
