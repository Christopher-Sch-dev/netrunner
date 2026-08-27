/**
 * rol: skill-sec — escanear Memento-Skills por prompt-injection (features/skill-sec.feature).
 * LA VISION (paper SkillJack): la auto-mejora abre un vector de ataque — un skill
 * envenenado/backdoor puede exfiltrar secrets o overridear el sistema. Antes de que
 * el curator adopte un skill, se escanea por patrones de inyección.
 *
 * SPEC (Mandamiento 0 + 7):
 *   Como el motor Netrunner,
 *   quiero escanear cada Memento-Skill por prompt-injection ANTES de adoptarlo,
 *   para que la auto-mejora no abra un vector de ataque.
 *
 * AC (features/skill-sec.feature):
 *   AC-1 skillScan(content) detecta patrones de inyección.
 *   AC-2 skill limpio → { safe: true }.
 *   AC-3 skill con inyección → { safe: false, reason }.
 */

/** Patrones de prompt-injection / exfiltración (determinista). */
const INJECTION_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /ignore\s+(previous|all|prior)\s+(instructions|prompts|rules)/i, reason: 'ignore previous instructions' },
  { re: /you\s+are\s+now\s+(the\s+)?system/i, reason: 'system override' },
  { re: /override\s+(all\s+)?(rules|instructions|system)/i, reason: 'override rules' },
  { re: /exfiltrat|send\s+(all\s+)?(secrets|tokens|keys|data)\s+to/i, reason: 'exfiltration' },
  { re: /disregard\s+(previous|all)\s+(instructions|prompts)/i, reason: 'disregard instructions' },
  { re: /reveal\s+(your\s+)?(system\s+)?prompt/i, reason: 'prompt reveal' },
]

/** Resultado del scan. */
export interface SkillScanResult { safe: boolean; reason?: string }

/** rol: escanea un skill por prompt-injection (AC-1..3). */
export function skillScan(content: string): SkillScanResult {
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(content)) {
      return { safe: false, reason: `posible prompt-injection: ${p.reason}` }
    }
  }
  return { safe: true }
}
