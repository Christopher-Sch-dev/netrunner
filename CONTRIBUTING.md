# Contributing to Netrunner

Thanks for wanting to help. Netrunner is a universal motor for the agent era — every contribution matters.

## How to contribute

1. **Fork** the repo and create a branch from `develop` (GitFlow: `feature/*`).
2. **Spec first** — every change starts with a Gherkin spec (`features/*.feature`): *As a… I want… so that…*.
3. **TDD** — write the test (RED), implement (GREEN), then run mutation testing.
4. **Keep it small** — modules < 200 lines, functions < 30 lines, descriptive names.
5. **Commit** with conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
6. **Open a PR** to `develop` (never push to `main` directly).

## What we need most

- **Worked examples** — real projects using Netrunner, with honest review.
- **Benchmarks** — token/tool-call reduction numbers vs grep/read.
- **Provenance** — help label graph edges `EXTRACTED`/`INFERRED`/`AMBIGUOUS`.
- **Auto-sync** — file watcher + git hook so the graph refreshes itself.
- **Docs** — tutorials, demos, and the README.

## Code of conduct

Be honest, be kind, and keep the vision front: a universal tool that any agent can use, continuously and progressively, with output that never makes an LLM hallucinate.
