---
name: run-stack-check
description: >-
  Run Tech Stack Checker locally (CLI or web), interpret compliance reports,
  and troubleshoot GitHub or AI tie-breaker issues. Use when testing changes,
  verifying a repo against an allowed list, or explaining exit codes and
  (implied)/(AI) match labels.
---

# Run stack check

## Prerequisites

- Node 20+, `pnpm install`
- Optional: `.env.local` from `.env.example` (`GITHUB_TOKEN`, `OPENAI_*` for `--use-ai`)

## CLI

```bash
# Basic
pnpm check -r owner/repo -a React TypeScript

# CI: fail job when non-compliant
pnpm check -r owner/repo -a React --strict

# Broad allowed entry + LLM (needs API config)
pnpm check -r owner/repo -a "Python web frameworks" --use-ai

# Save reports
pnpm check -r owner/repo -a React -o all --output-dir ./reports
```

## Web

```bash
pnpm dev
```

Open http://localhost:3000 — same engine via `POST /api/analyze`.

## Read the report

| Signal | Meaning |
|--------|---------|
| `NON-COMPLIANT` | Detected tech not on allowed list (after implied + AI) |
| `(implied)` | Allowed because a parent entry is on the list (see `ecosystem.ts`) |
| `(AI)` | LLM matched a **broad** allowed phrase |
| `AI mode: invoked` | LLM API was called |
| `AI mode: enabled but not invoked` | `--use-ai` but no broad entries or nothing to match |
| `●●●` / `●●○` / `●○○` | Detection confidence, not permission |

## Common failures

| Symptom | Fix |
|---------|-----|
| Repo not found | Push to GitHub or set `GITHUB_TOKEN` for private repos |
| `ELIFECYCLE` exit 1 | Use `--strict` only in CI; default exit is 0 after report |
| AI not invoked | Add broad entry (e.g. `"JavaScript testing tools"`) with `--use-ai` |
| Rate limit | Set `GITHUB_TOKEN` |

## Verify after code changes

```bash
pnpm lint
pnpm build
pnpm check -r expressjs/express -a JavaScript Node.js Express
```
