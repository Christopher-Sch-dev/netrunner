# Netrunner — Plug any project into any agent

**The universal jack.** Connect every project, every agent, one net.

Netrunner is an open-source, MIT-licensed **universal agent SDK**: a single binary that turns *any* project into something *any* AI agent can understand, operate, and control — with one command.

Inspired by the netrunners of Night City: the ones who jack into *any* system. Netrunner is that jack for your codebase.

---

## Why Netrunner

Today, making a project agent-operable means assembling a pile of moving parts: an MCP server here, a plugin there, a skill somewhere else, a graph index apart. That's **fragmentation as packaging, not engineering**. All those formats are just *views of the same contract*.

Netrunner is a **single motor** that is at the same time:

- **An AI SDK** — a clean programmatic contract for your tools.
- **An MCP server** — the universal transport (stdio + streamable HTTP).
- **A skill** — procedural know-how for how the project is operated.
- **A plugin** — Agent Plugins 1.0 portable packaging.
- **A code knowledge graph** — context for the agent, so it never greps blind.
- **An agentic control plane** — deterministic operations, not blind commands.

One binary, all six. No 500-tool menu: Netrunner exposes **only what's relevant** to the project and objective at hand (progressive disclosure).

---

## What it gives an agent

| Face | What the agent gets |
|---|---|
| **Understand** | Project dashboard, symbol map, call graph, blast radius — answers in a handful of calls, not grep/read storms |
| **Control** | Deterministic operations (test, build, lint, config, domain ops) with idempotency and exit codes |
| **Learn** | A built-in skill (`netrunner-<type>`) that teaches how to operate *this kind* of project |
| **Safely** | Read vs mutate separation, "plan before mutate" gate, tool approvals |

---

## Quickstart

```bash
# Install (Linux/macOS)
curl -fsSL https://github.com/Christopher-Sch-dev/netrunner/raw/main/install.sh | sh

# Windows
irm https://github.com/Christopher-Sch-dev/netrunner/raw/main/install.ps1 | iex

# npm
npm i -g netrunner
```

```bash
# In any project
cd your-project
netrunner init        # index the project, generate the connectivity layer
netrunner install     # wire up your agents (MCP/ACP/harness/plugin)

# In your agent
netrunner             # project dashboard (content-first)
netrunner plan "<goal>"   # the plan + only the relevant actions
netrunner <action>    # run a deterministic operation
```

---

## Architecture

```
        MCP server · Harness-adapter · Agent Plugin · CLI/AXI   ← 4 views
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

## Roadmap (MVP ~90 days)

1. `netrunner init` — index the project + generate the connectivity layer.
2. `netrunner install` — connect agents (MCP/ACP/harness/plugin).
3. `netrunner policy` — cross-client permissions.
4. Self-improvement — background review + deterministic curator + Memento-Skills.

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
