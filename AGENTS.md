# AGENTS.md — Working here (for humans *and* AI agents)

This file tells any agent (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) how to work in this repository. Read it before touching code.

## What this project is

Netrunner is a **universal agent CDK** (open-source, MIT): a single binary that turns any project into something any AI agent can understand, operate, and control. It is at the same time an AI SDK, an MCP server, a skill, a plugin, a code knowledge graph, and an agentic control plane — all views of one tool contract.

## Commands

- `pnpm install` — install workspace deps.
- `pnpm test` — run unit tests (vitest).
- `pnpm test:e2e` — run end-to-end scenario tests (Playwright).
- `pnpm build` — build the binary (`bun build --compile`).
- `pnpm mutate` — mutation testing (Stryker).

## How to work here

1. **Read `.onyx/` first** — PROJECT.md (what this is), RULES.md (how to work), DECISIONS/ (decisions made), TESTING.md (what tests validate).
2. **Spec before code.** Every feature starts in `spec.md` with *As/In order to/I want* + Acceptance Criteria. No code without a spec.
3. **Gherkin.** Translate each story into `features/*.feature` (Given/When/Then).
4. **TDD.** RED (failing test) → GREEN (minimal implementation) → refactor.
5. **Mutation testing.** Verify your tests actually test (Stryker). Never skip it.
6. **External verification.** Tests / exit codes are the source of truth. Never "I checked my code and it's fine".
7. **Never commit secrets.** This is a public repo: no API keys, tokens, passwords, private keys, `.env`.
8. **Keep the core contract stable.** `src/core` (ToolRegistry) is the single pure interface. Formats (MCP/harness/plugin/CLI) are views of it — add a view, don't duplicate logic. Version the contract if you change it.
9. **Extensibility over hardcoding.** Connectors (filesystem, subprocess, sandbox, git, telemetry) are plugins. Use DI, never `new Dep()` inline.

## Branch strategy (GitFlow)

- `main` — production, protected. Never commit directly.
- `develop` — integration, protected. Never commit directly.
- `feature/*` — one feature per branch, from develop.
- `release/*` — QA + version, from develop → main.
- `hotfix/*` — urgent prod fix, from main.

Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.

## Rules

- PROHIBITED: committing secrets.
- PROHIBITED: writing source code without a spec first.
- PROHIBITED: deploying without a scenario test.
- PROHIBITED: auto-critique as verification.
- PROHIBITED: breaking `src/core` without versioning.

## Decision record

Decisions live in `.onyx/DECISIONS/` as `DEC-NNN-slug.md` in Gherkin format (Given/When/Then + why + rejected alternatives).
