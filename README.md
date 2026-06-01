# Tech Stack Checker

A small tool that analyzes a GitHub repository and reports whether it uses
only technologies from an approved stack. Detection is **deterministic**:
manifest files + GitHub's language byte stats are parsed directly, no LLM
required. An optional LLM tie-breaker can be enabled for fuzzy
allowed-list entries like *"JavaScript testing tools"*.

## What it does

Given:
- a GitHub repository (`org/repo`)
- a list of allowed technologies (languages / frameworks / tools)

it produces a report containing:
- whether the repo is compliant
- every detected technology, with category, confidence, and source attribution
- which are allowed, which are not, and which allowed entry matched
- uncertainties and assumptions
- the exact files that were analyzed

Output is available as colorized CLI, JSON, or HTML. The tool ships both a
CLI and a small Next.js web UI that wraps the same engine.

## How to run

### Prerequisites

- Node.js 20.12+
- pnpm (or npm / yarn / bun)

That's it. No API keys needed for the default (deterministic) mode.

### Install

```bash
pnpm install
cp .env.example .env.local   # only needed for the optional GITHUB_TOKEN or AI
```

### CLI

```bash
# Inline allowed list
pnpm check -r "expressjs/express" -a JavaScript "Node.js" Mocha ESLint Prettier

# YAML/JSON config file
pnpm check-config -c example-config.yaml

# Save JSON + HTML reports
pnpm check -r "vercel/next.js" -a TypeScript JavaScript React "Next.js" \
  -o all --output-dir ./reports

# Opt-in: use an LLM to evaluate broad allowed-list entries
pnpm check -r "owner/repo" -a TypeScript "JavaScript testing tools" --use-ai
```

| Flag | Description |
|---|---|
| `-r, --repo <slug>` | GitHub repo `org/repo` (required) |
| `-a, --allowed <techs...>` | Allowed technologies (required) |
| `-c, --config <file>` | YAML or JSON config file (for `check-config`) |
| `-o, --output <format>` | `cli`, `json`, `html`, or `all` (default `cli`) |
| `--output-dir <dir>` | Output directory (default `./reports`) |
| `-t, --token <token>` | GitHub token (or set `GITHUB_TOKEN`) |
| `--use-ai` | Use an LLM to match broad allowed-list entries |

Exit codes: `0` compliant, `1` non-compliant, `2` error.

### Web UI

```bash
pnpm dev
# open http://localhost:3000
```

Same engine as the CLI; the UI just calls `POST /api/analyze` with the
repo, allowed list, and an optional `useAI` flag.

### Optional: AI tie-breaker

If you pass `--use-ai`, the tool sends a tiny payload to any
OpenAI-compatible endpoint (OpenAI cloud, Ollama, Groq, Together,
OpenRouter, …). It is used *only* to decide whether an unmatched detected
technology belongs to a broad allowed-list entry such as `"JavaScript
ecosystem"`. Deterministic detection runs the same way regardless.

Configure via `.env.local` (see `.env.example` for full examples):

```bash
# Default: OpenAI cloud
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Or: free local Ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
AI_MODEL=qwen2.5:7b
```

## Inputs

### Config file (YAML)

```yaml
repository: "vercel/next.js"
allowedTechnologies:
  - TypeScript
  - React
  - Next.js
  - Jest
useAI: false   # optional, default false
```

JSON is also accepted. See `example-config.yaml` for a fuller example.

### Allowed-list semantics

- **Exact / aliased names** (e.g. `TypeScript`, `ts`, `typescript`, `Next.js`,
  `nextjs`) are matched deterministically via a built-in alias table.
- **Broad categories** (e.g. `"JavaScript testing tools"`,
  `"Spring ecosystem"`) are *not* evaluated without `--use-ai`. They will
  show up under "Uncertainties" so it's obvious nothing matched against them.

## Overall approach

```
┌────────────────┐   ┌───────────────────┐   ┌────────────────────────┐   ┌──────────┐
│ GitHub API     │──▶│ Detectors (per    │──▶│ Compliance matcher     │──▶│ Reporter │
│ files + langs  │   │ ecosystem parser) │   │ (alias + optional AI)  │   │ CLI/JSON/│
└────────────────┘   └───────────────────┘   └────────────────────────┘   │ HTML/UI  │
                                                                          └──────────┘
```

1. **GitHub client** (`src/github.ts`) fetches a fixed allow-list of manifest
   files (`package.json`, `pyproject.toml`, `pom.xml`, `go.mod`, …) plus
   GitHub's `/languages` byte counts (Linguist-powered).
2. **Detectors** (`src/detectors.ts`) — one small function per ecosystem.
   Each parses the relevant manifests deterministically and emits
   `DetectedTechnology[]` with category, confidence, and the file/line that
   produced it. New ecosystems are added by writing another ~30-line function.
3. **Aliases** (`src/aliases.ts`) canonicalises names so `ts`, `typescript`,
   and `TypeScript` collapse to the same key.
4. **Compliance matcher** (`src/compliance.ts`) does a deterministic
   set match. If `useAI` is on **and** the allowed list contains broad
   entries, it sends just the unresolved names + broad entries to an LLM
   for a tie-break decision; those matches are tagged `"(AI)"` in the
   report so reviewers can spot them.
5. **AI client** (`src/ai.ts`) is a ~40-line `fetch` wrapper around the
   OpenAI-compatible chat-completions API. No vendor SDK.
6. **Reporter** (`src/reporter.ts`) renders CLI (chalk), JSON, or HTML.

## Important design decisions

1. **Deterministic by default, AI is opt-in.** A compliance tool should
   be reproducible and explainable. Manifest files are structured; a 200-line
   parser handles them perfectly without the cost, latency, or
   non-determinism of an LLM. AI is reserved for the one place it
   genuinely helps — matching against natural-language allowed-list
   entries — and even there it's behind `--use-ai`.
2. **GitHub Linguist for languages.** Instead of guessing from file
   extensions, we use GitHub's own `/repos/{owner}/{repo}/languages`
   endpoint (byte-accurate, free, cached server-side).
3. **Manifest files, not source code.** Configuration files are the
   reliable, low-volume signal for what a project *uses*. Scanning every
   `.kt` or `.py` file would be slower, hit rate limits, and rarely add
   anything that wasn't already in `build.gradle.kts` or `pyproject.toml`.
4. **Canonical alias map over a fuzzy matcher.** A small hand-curated
   map (`src/aliases.ts`) covers the realistic variations
   (`Next.js`/`nextjs`/`next`, `pytest`/`PyTest`, …) and stays auditable.
5. **Confidence tags surface uncertainty.** Direct dependencies →
   `high`; inferred from byte counts only → `medium` or `low`. Low-confidence
   detections are also echoed in the "Uncertainties" section.
6. **No vendor lock-in.** Removed `ai`, `@ai-sdk/openai`, `@vercel/analytics`
   and the many shadcn components we weren't actually using. The AI client
   is plain `fetch` and works with any OpenAI-compatible endpoint.
7. **Single engine, two front-ends.** Both the CLI and the Next.js
   `/api/analyze` route call the same `analyze()` function — no business
   logic duplicated in the web layer.

## Assumptions

- Public repositories work without a token; private repos need a
  `GITHUB_TOKEN`.
- We analyze the default branch (`HEAD`).
- We focus on the language/framework/tool level — individual npm/PyPI
  libraries (Lodash, requests, …) are intentionally not enumerated.
- The first ~40 indicator files in the tree are fetched (enough for
  realistic monorepos, cheap enough to avoid rate limits).

## Limitations and known gaps

- **Per-ecosystem coverage is best-effort.** The detectors cover the most
  common ecosystems (JS/TS, Python, JVM, Go, Rust, Ruby, PHP, Docker,
  GitHub Actions) but are deliberately shallow — a new ecosystem needs a
  new tiny detector function.
- **Monorepos**: nested `package.json` files inside the fetched window
  are parsed, but workspace-aware behaviour is not implemented.
- **No version pinning checks.** "TypeScript 5.x only" can't be
  expressed today.
- **Lockfiles aren't parsed for transitive deps.** We trust the
  declared dependencies in the top-level manifest.
- **AI tie-breaker is best-effort.** Different LLMs will produce
  slightly different matches for broad categories; AI-matched entries
  are explicitly tagged so reviewers can audit them.

## What I would improve next

1. **Version checks** — express constraints like "TypeScript >= 5" in
   the allowed list and validate against `engines` / dependency versions.
2. **Monorepo / workspace awareness** — recurse into `pnpm-workspace.yaml`,
   `lerna.json`, Gradle multi-module setups.
3. **Caching** — memoize GitHub responses by SHA to make repeat runs free.
4. **Per-ecosystem unit tests** — each detector should have a small
   fixture-based test suite; the parsers are pure functions, so this is
   cheap to add.
5. **Custom alias / category rules from the config file** — let users
   teach the tool that `"@company/internal-test-utils"` means JUnit.
6. **CI integration** — a GitHub Action that fails the build on
   non-compliance.

## Project layout

```
src/
  aliases.ts       canonical-name table
  detectors.ts     one small function per ecosystem
  compliance.ts    deterministic matcher + optional AI tie-breaker
  ai.ts            ~40-line OpenAI-compatible fetch client
  analyzer.ts      orchestrator (compose detectors + compliance)
  github.ts        Octokit wrapper (files + language bytes)
  reporter.ts      CLI / JSON / HTML renderers
  cli.ts           Commander entry point
  types.ts         shared types & zod config schema
app/
  page.tsx         minimal Next.js UI
  api/analyze/     POST endpoint that calls analyze()
```

## Example output

```
============================================================
  TECHNOLOGY STACK COMPLIANCE REPORT
============================================================

Repository: expressjs/express
 ✗ NON-COMPLIANT  Some technologies are not in the allowed list

Summary:
  Total technologies detected: 5
  Allowed: 4
  Not allowed: 1
  Low confidence: 0

✓ Allowed Technologies:
  • ESLint [tool] ●●● (matches: ESLint)
    └─ dependency: eslint
    └─ Source: package.json
  • JavaScript [language] ●●● (matches: JavaScript)
  • Mocha [tool] ●●● (matches: Mocha)
  • Node.js [runtime] ●●● (matches: Node.js)
    └─ engines.node = >= 18

✗ Not Allowed Technologies:
  • GitHub Actions [tool] ●●●
    └─ 4 workflow file(s)
```

## License

MIT
