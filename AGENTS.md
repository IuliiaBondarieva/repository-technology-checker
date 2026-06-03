# Agent guide — Tech Stack Checker

This repository checks whether a **GitHub** repo’s detected stack matches an **allowed technology list**. Detection is mostly deterministic; an optional LLM only resolves **broad** allowed-list phrases (e.g. “Python web frameworks”).

## Quick commands

| Task | Command |
|------|---------|
| Web UI | `pnpm dev` → http://localhost:3000 |
| CLI check | `pnpm check -r owner/repo -a Tech1 Tech2` |
| Config file | `pnpm check-config -c example-config.yaml` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| CI fail on non-compliance | add `--strict` to `pnpm check` |

Copy `.env.example` → `.env.local` for `GITHUB_TOKEN` and optional AI (`OPENAI_*`, `AI_MODEL`).

## Architecture (do not blur layers)

```
app/              Next.js routes only (page, layout, api/analyze)
src/core/         Shared engine — types, github client, analyzer (no React)
src/web/          Web UI — hooks, components, ReportView
src/cli/          CLI — commander entry, terminal/json/html reporters
```

- **Import path**: `@/src/core/...`, `@/src/web/...`, `@/src/cli/...`
- **Single report UI**: `src/web/report/ReportView.tsx` (CLI HTML reuses it via `HtmlReporter.tsx`)
- **Do not** put detection logic in `app/` or CLI; extend `src/core/analyzer/`

## Compliance pipeline

1. `GitHubClient` fetches indicator manifests + `/languages` (`src/core/github/github.ts`)
2. `runDetectors()` in `detectors.ts` emits `DetectedTechnology[]`
3. `checkCompliance()` in `compliance.ts`: exact match → **implied companions** (`ecosystem.ts`) → optional AI for broad entries
4. `buildReport()` in `analyzer.ts` assembles `AnalysisReport`

Match labels in reports:

- `(implied)` — allowed via `ECOSYSTEM_COMPANIONS` (e.g. React → Node.js)
- `(AI)` — LLM matched a broad allowed-list entry

## Where to change what

| Goal | File(s) |
|------|---------|
| New ecosystem / manifest signal | `src/core/analyzer/detectors.ts` + fetch list in `github.ts` |
| Alias / canonical names | `src/core/analyzer/aliases.ts` |
| Framework → companion allows | `src/core/analyzer/ecosystem.ts` |
| Broad vs exact allowed entries | `isBroadCategory()` in `aliases.ts` |
| LLM prompt / client | `compliance.ts`, `ai.ts` |
| Report fields / assumptions | `analyzer.ts`, `types.ts` |
| CLI flags / exit codes | `src/cli/cli.ts` |
| Web form + API body | `useAnalysisForm.ts`, `app/api/analyze/route.ts` |

## Conventions

- **Minimize scope** — smallest correct diff; match existing naming and patterns
- **No over-engineering** — prefer extending `DETECTORS` or `ECOSYSTEM_COMPANIONS` over new abstractions
- **Tests** — only when asked or when covering non-trivial behavior
- **Secrets** — never commit `.env.local`; document vars in `.env.example`
- **CLI exits** — `0` success after report; `1` only with `--strict` + non-compliant; `2` errors

## AI coding artifacts in this repo

| Artifact | Purpose |
|----------|---------|
| `AGENTS.md` (this file) | High-level orientation for agents |
| `.cursor/rules/*.mdc` | Scoped coding standards |
| `.cursor/skills/*/SKILL.md` | Task workflows (auto-suggested by Agent) |
| `.cursor/commands/*.md` | Slash commands — type `/` in chat (explicit, faster) |

### Slash commands (type `/` in Cursor chat)

| Command | Use for |
|---------|---------|
| `/onboard` | Quick codebase tour |
| `/check-repo` | Run `pnpm check` and interpret the report |
| `/smoke-test` | `lint` + `build` + sample check |
| `/dev-web` | Start `pnpm dev` and UI debugging hints |
| `/extend-analyzer` | Add detection, aliases, or fetch paths (uses extend-analyzer skill) |
| `/add-companion` | Add implied allow rule in `ecosystem.ts` |
| `/fix-cli-report` | CLI terminal / JSON / HTML / ReportView fixes |

## Product limits (read before changing behavior)

- GitHub only, default branch, ~40 indicator files max per run
- Manifest-level detection — not full dependency trees or source scanning
- `--use-ai` requires **broad** allowed-list entries; exact names use aliases + implied companions only

Full user-facing docs: `README.md`, layout detail: `src/README.md`.
