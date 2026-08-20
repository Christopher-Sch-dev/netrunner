### DEC-003 — CI/CD con gates de test + git hooks + evaluación de fx (vercel-labs)

- **Fecha**: 2026-08-20
- **Decisión** (Given/When/Then):

  **GIVEN** Netrunner es un repo público con GitFlow (main/develop protegidas, PR required), stack TS+Bun+pnpm, Vitest + Stryker + Playwright,
  **WHEN** se necesita asegurar que ningún código roto pase a build/deploy/prod,
  **THEN** se establecen: (1) workflows de GitHub Actions con gates de test/typecheck/lint/mutation antes de cualquier build o deploy; (2) git hooks locales (pre-commit: lint+test; pre-push: test completo) como red de seguridad de DX; (3) una evaluación de `vercel-labs/fx` para decidir si sirve al motor (como harness target vía ACP o como referencia de minimalismo WASM).

- **Por qué**:
  - El Mandamiento 6 (testing) y 8 (verificación externa) exigen que el enforcement real de calidad sea el test que corre (exit code no falseable). CI/CD con gates lo garantiza en el repo.
  - GitHub Actions: verificada cuenta autenticada `Christopher-Sch-dev`, acciones habilitadas, `allowed_actions: all`, repo público → los runners y la branch protection funcionan.
  - `vercel-labs/fx` (leído): harness de agente en **Zig** (1.5k★, Apache-2.0, Experimental), CLI tipo Unix, `fx acp` (ACP), skills/MCP/subagentes, **embeddable vía WASM** (`fx-core.wasm`, 7.8 MiB). Relevante como **target harness** (conectar Netrunner a fx vía ACP) y como **referencia de minimalismo** (binario 7.8MiB). NO es un motor de conexión → no compite con Netrunner; se evalúa para integrarlo como harness concreto en la vista ACP.
  - Los gates de test son "spec antes de código" llevado al nivel de repo: nada pasa a build sin test verde.

- **Alternativas rechazadas**:
  - *Deploy directo sin gates* → viola Mandamiento 6/8 (deploy sin test de escenario). Rechazado.
  - *Solo git hooks, sin CI* → los hooks locales no se distribuyen en el clone; CI es el gate autoritativo en GitHub. Ambos, no uno solo.
  - *Integrar fx como motor interno* → fx es un harness (agente), no un motor de conexión; integrarlo como núcleo contradice la arquitectura (el motor es orquestador, no harness). Se usa como target/conector, no como base.

- **Spec/Gherkin relacionado**: spec.md (AC-13 pipeline PRO, AC-14 CLI agent-friendly). Evaluación fx en `.doc/auditoria/`.
