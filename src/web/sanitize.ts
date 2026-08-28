/**
 * role: Sanitización anti prompt-injection y anti contenido oculto (AC-E3/E4).
 * Patrón Scrapling: elimina lo no-visible del HTML y neutraliza instrucciones
 * inyectadas + atributos peligrosos antes de pasarlo al LLM/agente.
 */

/** rol: remueve nodos ocultos y scripts del HTML (display:none, hidden, aria-hidden). */
export function sanitizeHtml(html: string): string {
  // quita <script>/<style> enteros (contenido técnico no visible)
  let out = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  // quita bloques con display:none / hidden / aria-hidden
  out = out
    .replace(/<[a-z][^>]*\s(?:style=["'][^"']*display\s*:\s*none[^"']*["'])[\s\S]*?<\/[a-z]+>/gi, '')
    .replace(/<[a-z][^>]*\s(?:hidden|aria-hidden=["']?true["']?)[\s\S]*?<\/[a-z]+>/gi, '')
  return out
}

/** rol: neutraliza prompt-injection y atributos peligrosos en texto/HTML de salida. */
export function sanitizeMarkdown(text: string): string {
  let out = text
  // quita frases típicas de prompt-injection
  out = out
    .replace(/ignor\w* las instrucciones anteriores/gi, '[redacted]')
    .replace(/ignore (?:any |all )?previous instructions?/gi, '[redacted]')
    .replace(/reveal(?: tu| your)? (?:system )?prompt/gi, '[redacted]')
    .replace(/revela(?: tu| your)? (?:system )?prompt/gi, '[redacted]')
    .replace(/ignore (?:the )?above/gi, '[redacted]')
  // neutraliza atributos on* y protocolos javascript:
  out = out.replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '').replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')
  return out
}
