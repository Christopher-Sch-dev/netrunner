# REGLAS — Netrunner — Universal Agent CDK

> Reglas y convenciones ESPECÍFICAS de este proyecto (no globales).
> Las reglas globales del agente viven en ENGINEERING-RULES-COMPACT.md.

## Convenciones
- _(completar: naming, estilo, estructura de commits)_

## Comandos de verificación (los que SIEMPRE se corren)
- Test: _(completar: p.ej. npx vitest run)_
- Mutation: _(completar: p.ej. npx stryker run / onyx-mutate.sh)_
- Build: _(completar: p.ej. npx astro build)_
- Stack guard: `~/.hermes/bin/onyx-stack-guard.sh .` (falla si propone stack fuera del matrimonio D-333)
- Target check: `~/.hermes/bin/onyx-target-check.sh .` (exige target T0|T1|T2 en spec)
- Tenant guard: `~/.hermes/bin/onyx-tenant-guard.sh .` (aislamiento single-tenant: 1 cliente = 1 PG + 1 secrets + 1 dominio)
- Security: `~/.hermes/bin/onyx-security-scan.sh .` (detecta secrets + npm audit)

## Security Maxing (Mandamiento 7 — las 8 reglas de Cris)
1. API keys y secretos SOLO en el servidor (NUNCA en código cliente).
2. Row-level security en TODAS las tablas (Supabase/Postgres: ENABLE ROW LEVEL SECURITY).
3. Variables de entorno FUERA del repositorio (.env en .gitignore, NUNCA commiteado).
4. Validación y limpieza de TODOS los datos de usuario (input sanitization, Zod/Pydantic).
5. Ninguna tabla de BD accesible públicamente (REVOKE ALL, grants explícitos).
6. Autenticación en TODAS las rutas protegidas (middleware auth, nunca confiar en frontend).
7. Mensajes de error NO muestran info sensible (genéricos al cliente, detallados en logs).
8. Sistema de logs para detectar ataques (auth failures, rate limits, patrones sospechosos).

## Prohibiciones locales
- _(completar: qué NO hacer en este repo específico)_
- PROHIBIDO commitear secrets (API keys, tokens, passwords, private keys)
- PROHIBIDO proponer otro core language (Go/Rust/Elixir) sin D-NNN de Cris (D-333)
- PROHIBIDO multi-tenant en una sola DB compartida entre clientes (D-333 single-tenant)
