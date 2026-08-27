# Spec — Netrunner: Universal Agent SDK

> Root specification of the unified engine. Unlocks the target-check. Implemented in later phases.
> Architecture validated by audits (DEC-001): a single core (tool contract) + projected formats (MCP server, harness-adapter, Agent Plugin, CLI/AXI).

## As / I want / so that

**As** a developer/creator with any project, app or demo (any stack),
**I want** a single `netrunner` binary that, when connected to my project, gives any agent (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) the **context** (knowledge graph), the **usage** (deterministic operations) and the **agentic control** of the project,
**so that** I can plug any project into any agent without reinventing protocol, without fragmenting into N tools, and with internal self-improvement.

## Target

**T0** — free open-source CLI, a single standalone local binary, no mandatory servers. (Optional MCP server deployment in T1/T2.)

## Acceptance Criteria (AC)

### Unified engine
- **AC-1**: `netrunner init` on an existing project indexes the project (knowledge graph) and generates the agent-operable connectivity layer: `mcp.json`/MCP server, `plugin.json` + `skills/` (Agent Plugins 1.0), a `SKILL` markdown file readable by any agent, and `AGENTS.md`.
- **AC-2**: `netrunner init` is idempotent: re-running it does not duplicate artifacts or break what was generated.
- **AC-3**: A single `netrunner` binary exposes the formats (MCP server, harness-adapter, Agent Plugin, CLI) as views of the SAME tool contract (`src/core`) — without duplicating handlers.

### Understand and control
- **AC-4**: `netrunner` (no args) returns a content-first dashboard of the project: stack, capabilities, symbol/file/test counts, next steps.
- **AC-5**: `netrunner query/callers/callees/impact` expose the project's knowledge graph (symbols, call paths, blast radius) — the agent answers in a few calls, without massive grep/read.
- **AC-6**: `netrunner <action>` runs deterministic project operations (test, build, lint, config, business ops) with standard exit codes, idempotency and read vs mutate separation.

### Connect agents
- **AC-7**: `netrunner install [--target=claude,codex,...]` connects the project to concrete agents (Claude Code, Codex, Hermes, OpenCode, Cursor, MCP) emitting each one's specific config (MCP/ACP/harness/plugin).
- **AC-8**: `netrunner install` is reversible (can undo the connection without leaving residue).

### Context/target determinism
- **AC-9**: The engine exposes only the tools relevant to the project's context and the declared target (progressive disclosure), not a menu of 500 tools.

### Cross-client policy
- **AC-10**: `netrunner policy` applies/reads the same policy (intent) across different agents consistently, without duplicating the definition.

### Self-improvement
- **AC-11**: The engine exposes a self-review fork (background review) with a deterministic curator, whose improvements are anchored to external signal (real result), NOT to self-criticism.
- **AC-12**: Improvements materialize as Memento-Skills (markdown skills + router/writer) versioned in the project.

### Quality/standard
- **AC-13**: Every engine command follows the PRO pipeline (spec → gherkin → TDD → mutation) with at least 1 test per AC.
- **AC-14**: The CLI is agent-friendly and follows the agent-CLI guide (ai-native-cli).

## Out of scope (later phase)
- The engine's source code (built in phases). This spec is the root contract.
