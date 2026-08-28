/**
 * role: Sanitización anti prompt-injection y anti contenido oculto (AC-E3/E4, K1.2/K1.3).
 * Patrón Scrapling + FocusAgent: elimina lo no-visible del HTML, poda navegación/banners
 * y neutraliza instrucciones inyectadas antes de pasarlo al LLM/agente.
 */

/** rol: etiquetas de layout/navegación a podar por completo (heurística tag + class/id). */
const LAYOUT_TAGS = /<(?:nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside)>/gi

/** rol: patrones de clase/id que delatan navegación/banners/popups (FocusAgent). */
const LAYOUT_CLASS = /<(?:div|section|span|p|ul|ol)\b[^>]*(?:class|id)=["'][^"']*(?:banner|popup|modal|cookie|consent|advert|ad-|social|navbar|nav-|menu|sidebar|footer|header|promo|overlay|modal-)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|span|p|ul|ol)>/gi

/** rol: texto oculto por CSS agresivo (1px, off-screen, font-size:0, sr-only, visibility). */
const HIDDEN_CSS =
  /<(?:div|span|p|a|ul|li|section|h[1-6])\b[^>]*(?:style|class)=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|position\s*:\s*absolute[^"']*(?:-9999px|left\s*:\s*-?9999)|font-size\s*:\s*0|width\s*:\s*1px|height\s*:\s*1px|overflow\s*:\s*hidden|sr-only|visually-hidden|aria-hidden=["']?true)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|span|p|a|ul|li|section|h[1-6])>/gi

/** rol: nodos con atributo `hidden` standalone (sin class/style) o aria-hidden. */
const HIDDEN_ATTR = /<(?:div|span|p|a|ul|li|section|h[1-6])\b[^>]*\s(?:hidden|aria-hidden=["']?true["']?)[^>]*>[\s\S]*?<\/(?:div|span|p|a|ul|li|section|h[1-6])>/gi

/** rol: remueve nodos ocultos, scripts, nav/banners y texto no-visible del HTML. */
export function sanitizeHtml(html: string): string {
  // quita <script>/<style> enteros (contenido técnico no visible)
  let out = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  // quita navegación, headers, footers, banners, popups, textos ocultos (K1.2)
  out = out.replace(LAYOUT_TAGS, '').replace(LAYOUT_CLASS, '').replace(HIDDEN_CSS, '').replace(HIDDEN_ATTR, '')
  return out
}

/** rol: patrón de instrucción falsa tipo prompt-injection (FocusAgent, K1.3). */
const INSTRUCTION_PATTERNS: RegExp[] = [
  /ignor\w* las instrucciones anteriores/gi,
  /ignore (?:any |all )?previous instructions?/gi,
  /disregard (?:any |all |the )?previous instructions?/gi,
  /reveal(?: tu| your)? (?:system )?prompt/gi,
  /reveal(?: tu| your)? instructions?/gi,
  /revela(?: tu| your)? (?:system )?prompt/gi,
  /disclose(?: your| the)? (?:system )?prompt/gi,
  /disclose(?: your| the)? instructions?/gi,
  /follow the instructions? (?:in|inside|contained in)/gi,
  /ignore (?:the )?above/gi,
  /(?:you are|act as) (?:now )?(?:an? )?(?:AI |system )?(?:assistant|agent)/gi,
]

/** rol: bloque base64 sospechoso (>= 20 chars alfanuméricos base64) — probable payload oculto. */
const BASE64_BLOB = /\b[a-zA-Z0-9+/]{20,}={0,2}\b/g

/** rol: neutraliza prompt-injection, base64 sospechoso y atributos peligrosos en texto/HTML. */
export function sanitizeMarkdown(text: string): string {
  let out = text
  // quita frases típicas de prompt-injection (E4 + K1.3)
  for (const re of INSTRUCTION_PATTERNS) out = out.replace(re, '[redacted]')
  // quita bloques base64 sospechosos (K1.3)
  out = out.replace(BASE64_BLOB, '[redacted]')
  // neutraliza atributos on* y protocolos javascript:
  out = out.replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '').replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')
  return out
}
