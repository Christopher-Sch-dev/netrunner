# Netrunner — Plug any project into any agent

**The universal jack.** Connect every project, every agent, one net.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-brightgreen.svg)](https://github.com/Christopher-Sch-dev/netrunner/releases)
[![Tests](https://img.shields.io/badge/tests-121%20passing-green.svg)](https://github.com/Christopher-Sch-dev/netrunner/actions)

Netrunner is an open-source, MIT-licensed **universal agent SDK**: a single binary that turns *any* project into something *any* AI agent can understand, operate, and control — with one command.

Inspired by the netrunners of Night City: the ones who jack into *any* system. Netrunner is that jack for your codebase.

---

## Why Netrunner

Today, making a project agent-operable means assembling a pile of moving parts: an MCP server here, a plugin there, a skill somewhere else, a graph index apart. That's **fragmentation as packaging, not engineering**. All those formats are just *views of the same contract*.

Netrunner is a **single motor** that is at the same time:

- **An AI SDK** — a clean programmatic contract for your tools.
- **An MCP server** — the universal transport (stdio + streamable HTTP).
- **An ACP agent** — the Agent Client Protocol for IDEs (Zed, Neovim, VS Code).
- **A skill** — procedural know-how for how the project is operated.
- **A plugin** — Agent Plugins 1.0 portable packaging.
- **A code knowledge graph** — context for the agent, so it never greps blind.
- **An agentic control plane** — deterministic operations, not blind commands.

One binary, all seven. No 500-tool menu: Netrunner exposes **only what's relevant** to the project and objective at hand (progressive disclosure).

---

## What it gives an agent

| Face | What the agent gets |
|---|---|
| **Understand** | Project dashboard, symbol map, call graph, blast radius — answers in a handful of calls, not grep/read storms |
| **Control** | Deterministic operations (test, build, lint) with exit codes |
| **Learn** | A self-generating skill that documents the project (git, versions, coverage, services, TODOs) |
| **Safely** | Read vs mutate separation, fail-closed policy, Black ICE secret guard |

---

## Quickstart

> **Note:** Netrunner is pre-1.0. The binary is built from source (Bun). A release binary + `install.sh` are on the roadmap.

```bash
# Build from source (requires Bun)
git clone https://github.com/Christopher-Sch-dev/netrunner.git
cd netrunner
bun install
bun build --compile --outfile dist/netrunner src/cli.ts

# In any project
cd your-project
netrunner init        # index the project into a knowledge graph
netrunner status      # live snapshot: stack, git, versions, coverage, services, TODOs
netrunner install     # wire up your agents (MCP/ACP/plugin)
```

### Quick demo (real output)

```bash
$ netrunner status
{
  "stack": { "language": "typescript", "framework": "node", "packageManager": "pnpm" },
  "git": { "branch": "develop", "remoteUrl": "https://github.com/Christopher-Sch-dev/netrunner.git" },
  "versions": { "prod": { "zod": "^4.4.3" }, "dev": { "vitest": "^3.0.0" } },
  "coverage": { "lines": 0, "functions": 0, "branches": 0, "statements": 0 },
  "services": { "services": [] },
  "todos": { "todos": [ { "file": "src/context/todos.ts", "line": 2, "tag": "TODO", "text": "..." } ] }
}
```

Every command returns **clean JSON** (agent-parseable, no hallucination) with standard exit codes.

---

## Commands

| Command | What it does |
|---|---|
| `netrunner` | Project dashboard (content-first) |
| `netrunner init [dir]` | Index the project into a knowledge graph |
| `netrunner status [--docs]` | Live snapshot + regenerate README.generated.md / AGENTS.md |
| `netrunner scan` | Unified overlay: stack + git + versions + coverage + services + TODOs |
| `netrunner map` | Export the graph as JSON (D3/mermaid visualizable) |
| `netrunner depth <sym> <level>` | Query a symbol by depth (L0 basic → L3 blast radius) |
| `netrunner explore <sym>` | Search symbols by name |
| `netrunner plan "<goal>"` | Generate a plan from the indexed graph |
| `netrunner guard` | Black ICE: detect secrets and protected files |
| `netrunner persist "<decision>"` | Save a durable decision with provenance |
| `netrunner rollback [create]` | Snapshot / restore project state |
| `netrunner policy <intent>` | Evaluate a permission (read/mutate) |
| `netrunner curate` | Deterministic self-improvement from observations |
| `netrunner install <target>` | Wire up agents (mcp/opencode/claude/cursor/codex/gemini/hermes) |
| `netrunner plugin <name>` | Generate an Agent Plugin 1.0 package |
| `netrunner --mcp` | Serve as an MCP server over stdio |
| `netrunner --acp` | Serve as an ACP agent over stdio |
| `netrunner --help` | List commands |

Global flags: `--dir <path>` (operate a specific project), `--human` (readable output).

---

## Architecture

```
        MCP server · ACP agent · Agent Plugin · CLI/AXI   ← 4 views
                     │  (same ToolRegistry, no duplicated handlers)
        ┌────────────┴─────────────────────┐
        │   TOOLS CONTRACT (src/core)       │  ← single pure interface
        │   ToolRegistry · CapabilitySet    │
        └────────────┬─────────────────────┘
     context (graph) │ control (ops)  knowhow (skills)  storage(bun:sqlite)
        └────────────┴──────────────┴───────────────┘
     Connectors/seams: filesystem · subprocess · sandbox · git · telemetry
```

One `bun build --compile` → one binary `netrunner` that speaks all four formats by subcommand.

---

## Try it on a real project

Netrunner was tested end-to-end with an AI agent (OpenCode + Nemotron) against three real projects, with **no context given** — the agent just ran `netrunner` and understood each project:

| Project | What the agent learned |
|---|---|
| **demo-hvac** | TypeScript + Astro + pnpm, branch `main`, 499 graph nodes |
| **demo-landing** | TypeScript + Astro + npm, branch `master`, 36 graph nodes |
| **demo-lead-qualifier** | TypeScript + Astro + pnpm, 1285 graph nodes |

---

## Roadmap

**Shipped (v0.2.0):** knowledge graph, MCP + ACP + CLI + plugin views, self-generating skill (git/versions/coverage/services/TODOs), cyberpunk features (persist/map/scan/guard/depth/rollback), policy + curator.

**Next (v0.3.0):**
1. **Provenance in output** — label every edge `EXTRACTED`/`INFERRED`/`AMBIGUOUS` (anti-hallucination, from graphify).
2. **Auto-sync graph** — file watcher + git hook so the graph refreshes itself (from codegraph).
3. **Release binary + `install.sh`** — one-command install.
4. **Benchmarks** — published token/tool-call reduction numbers.

---

## Contributing

We'd love your help. Netrunner is ambitious — a universal motor for the agent era — and every contribution moves it forward.

- **Report a bug** → [Open an issue](https://github.com/Christopher-Sch-dev/netrunner/issues)
- **Request a feature** → [Open a discussion](https://github.com/Christopher-Sch-dev/netrunner/discussions)
- **Contribute code** → see [CONTRIBUTING.md](CONTRIBUTING.md) (spec-first → Gherkin → TDD → mutation)

---

## Development

- **Stack**: TypeScript + Bun + pnpm · Target T0 (local, no servers).
- **Method**: spec-first → Gherkin → TDD → mutation testing → e2e. See `.onyx/`.
- **Branches**: GitFlow (main → develop → feature/* / release/* / hotfix/*).
- **Read `AGENTS.md`** for how agents contribute to this repo.

## License

MIT. See [LICENSE](LICENSE).

---

*Netrunner — the universal jack. Built for the agent era.*
