# REGLAS — Netrunner — Universal Agent SDK

> Reglas y convenciones específicas de este proyecto (metodología de desarrollo).
> Son públicas y las siguen todos los contribuidores (humanos y agentes).

## Convenciones
- **Lenguaje**: TypeScript + Bun + pnpm (DEC-001). Target hosting: T0 (local, sin servidores).
- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- **Estructura**: paquete único `netrunner` (un solo `package.json`, un solo binario). Núcleo-contrato en `src/core/` + vistas como módulos en `src/` (MCP, ACP, CLI, plugin) + grafo en `src/context/` + auto-mejora en `src/auto/` + policy en `src/policy/`.
- **Ramas**: GitFlow (main protegida → develop → feature/* / release/* / hotfix/*).

## Flujo de verificación (los que SIEMPRE se corren)
1. **Spec primero** — toda feature parte de `spec.md` con formato *Como/quiero/para* + Acceptance Criteria.
2. **Gherkin** — cada historia se traduce a `features/*.feature` (Given/When/Then) ejecutable.
3. **TDD** — test que falla (RED) → implementación mínima (GREEN) → refactor.
4. **Mutation testing** — verificar que los tests realmente testean (Stryker, timeout 300s, nunca en hot path).
5. **E2E escenario** — al menos 1 test end-to-end por user story (PROHIBIDO deploy sin esto).
6. **Verificación externa** — tests/exit codes reales. NUNCA auto-crítica como verificación.

## Reglas de calidad (metodología de desarrollo)
1. **Modularización** — archivo >200 líneas se divide; función >30 líneas se divide.
2. **Mantenibilidad** — documentar código interno (`// rol: qué hace`), usar Dependency Injection (nunca `new Dep()` hardcodeado).
3. **Extensibilidad** — diseñar para el cambio: núcleo estable + conectores como plugins (adapters).
4. **Observabilidad** — medir: latencia p50/p95/p99, error rate, throughput. OpenTelemetry.
5. **Performance** — caching con TTL, índices en queries, streams para archivos grandes, serialización mínima.
6. **Testing** — unit + escenario (1 por user story) + integration. Test o muerte.
7. **Security** — API keys solo en servidor, validación de input (Zod), nunca secrets en repo público, errores genéricos al cliente, logs para detectar ataques.
8. **Loop engineering** — OBSERVE → PLAN → ACT → VERIFY → REFLECT → REPEAT.
9. **Escalabilidad 0→1B** — stateless-first, backpressure, idempotencia, choke points.

## Prohibiciones locales
- PROHIBIDO commitear secrets (API keys, tokens, passwords, private keys, .env).
- PROHIBIDO escribir código fuente sin spec previo (Mandamiento 0).
- PROHIBIDO deploy sin test de escenario.
- PROHIBIDO auto-crítica como verificación.
- PROHIBIDO romper el contrato de tools `src/core` sin versionarlo (mandamiento 3).
