# Tech Stack Checker

A tool that analyzes a **GitHub repository** and reports whether it appears to use only technologies from an **approved stack** you provide (languages, frameworks, and tools — not every library).

Detection is **deterministic by default**: it reads manifest/config files and GitHub language statistics. An **optional** LLM can help only when your allowed list contains broad, natural-language categories (e.g. *"JavaScript testing tools"*).

---

## What you can do

### Inputs

| You provide | Example |
|---|---|
| Repository | `vercel/next.js` (`owner/repo`) |
| Allowed technologies | `TypeScript`, `React`, `Spring Boot`, `Docker`, … |
| (Optional) GitHub token | Higher rate limits; required for private repos |
| (Optional) AI | `--use-ai` (CLI) or checkbox (web) for broad allowed-list entries |

Config via CLI flags, a YAML/JSON file (`example-config.yaml`), or the web form.

### Outputs

The report tells you:

- **Compliant or non-compliant** (any detected technology not on the allowed list → non-compliant)
- **Every detected technology** with category (language, framework, tool, …)
- **Whether each detected item is allowed**, and which allowed entry it matched
- **Detection confidence** (`●●●` high · `●●○` medium · `●○○` low) — how sure the tool is that the technology is present; **not** the same as allowed/not allowed
- **Source** (e.g. `package.json`, `pom.xml`, GitHub `/languages` API)
- **Uncertainties and assumptions** (e.g. low-confidence detections, skipped broad rules without AI)
- **List of files** that were fetched and analyzed

### How you can run it

| Interface | Command | Best for |
|---|---|---|
| **Web UI** | `pnpm dev` → http://localhost:3000 | Interactive checks, sharing with non-CLI users |
| **CLI (terminal)** | `pnpm check -r org/repo -a Tech1 Tech2 …` | Scripts, CI, local workflows |
| **CLI (JSON)** | `-o json --output-dir ./reports` | Automation, dashboards |
| **CLI (HTML)** | `-o html` | Static report file (same React layout as the web UI) |

Exit codes (CLI): `0` = analysis finished (report printed); `1` = non-compliant **only with `--strict`** (for CI); `2` = error (GitHub API, config, etc.).

### What gets detected (best-effort)

The tool looks at **configuration and CI manifests**, not your application source code. Supported ecosystems include:

- **JavaScript / TypeScript** — `package.json`, lockfiles, `tsconfig.json` (React, Next.js, Jest, Vite, ESLint, npm/pnpm/Yarn, Node.js, …)
- **Python** — `pyproject.toml`, `requirements.txt`, `Pipfile`, … (Django, Flask, pytest, Ruff, Poetry, …)
- **JVM** — `pom.xml`, Gradle/Kotlin build files (Java, Kotlin, Spring, JUnit, Gradle, Maven, …)
- **Go, Rust, Ruby, PHP** — `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`, …
- **Containers & CI** — `Dockerfile`, docker-compose, GitHub Actions workflows, GitLab CI, Jenkins
- **Languages from GitHub** — byte counts from the `/languages` endpoint (medium/low confidence when no manifest backs them up)

Name matching understands common aliases (`ts` → TypeScript, `nextjs` → Next.js) via a built-in table.

### What works well

- **Reproducible, explainable checks** — same repo + same allowed list → same result (unless you enable AI for broad categories)
- **Implied companions** — e.g. allowing `React` also allows `Node.js`, `JavaScript`, and common package managers (shown as `matches: React (implied)`); see `src/core/analyzer/ecosystem.ts` to extend the map
- **No API key required** for public repos in deterministic mode
- **Fast enough for a single-repo review** — only fetches a bounded set of indicator files
- **Honest uncertainty** — low-confidence detections are flagged; broad allowed-list entries are called out if AI is off

---

## Limitations (what this tool does **not** do)

Read these before relying on the tool for strict compliance gates.

### Scope of analysis

| Limitation | Detail |
|---|---|
| **GitHub only** | You cannot point the tool at a local folder; it needs `owner/repo` on GitHub. |
| **Default branch only** | Analysis uses `HEAD` on the default branch, not every branch or tag. |
| **Manifest-level, not library-level** | It checks languages, frameworks, and major tools — not whether `lodash` or `requests` is on an allow-list. |
| **No version rules** | You cannot require "TypeScript ≥ 5" or "Spring Boot 3.x only"; version strings in manifests are not validated. |
| **No transitive dependency audit** | Lockfiles are used as signals (e.g. package manager), not fully parsed for every transitive package. |
| **No source-code scanning** | Technologies used only in `.java`/`.py` files without appearing in build configs may be **missed**. |
| **Shallow ecosystem coverage** | Elixir, Swift, .NET, Terraform, Helm, monorepo workspaces, etc. are partial or unsupported; exotic stacks need new detector code. |
| **File fetch cap** | At most **40** indicator files are downloaded per run; very large monorepos may omit nested manifests without a warning in `uncertainties` yet. |

### Allowed-list matching

| Limitation | Detail |
|---|---|
| **Exact names only (default)** | Entries like `TypeScript` or `Jest` match via aliases. Phrases like *"JavaScript testing tools"* or *"Spring ecosystem"* **do not match anything** unless you enable AI. |
| **AI is optional and narrow** | With `--use-ai`, only **unmatched** detected items vs **broad** allowed entries are sent to an LLM. Matches are tagged `(AI)` in the report. Results can vary by model; AI does not drive detection itself. |
| **Conservative compliance** | If a technology is detected and not clearly allowed, it counts as **not allowed** — manual review is expected for borderline cases. |

### GitHub & environment

| Limitation | Detail |
|---|---|
| **Rate limits** | Without `GITHUB_TOKEN`, unauthenticated API limits apply (60 requests/hour). Use a token for regular use. |
| **Private repositories** | Need a `GITHUB_TOKEN` with access to the repo. |
| **Network required** | The tool calls the GitHub API (and optionally an LLM endpoint). |

### Report semantics

- **"Compliant" means "nothing detected looked disallowed"** — not a legal guarantee; detection can miss or mis-infer technologies.
- **Detection confidence ≠ permission** — a row can be green (allowed) with `●○○` (low confidence): allowed by your list, but weak evidence it is actually used.
- **False positives** are possible (e.g. devDependency or CI-only tool counted like production stack).

---

## How to run

### Prerequisites

- Node.js 20.12+
- pnpm (or npm / yarn / bun)

No API keys for the default (deterministic) mode on public repositories.

### Install

```bash
pnpm install
cp .env.example .env.local   # optional: GITHUB_TOKEN and/or AI settings
```

### Web UI

```bash
pnpm dev
# open http://localhost:3000
```

Enter `owner/repo`, add allowed technologies, optionally enable AI for broad list entries, then analyze.

### CLI

```bash
# Inline allowed list
pnpm check -r "expressjs/express" -a JavaScript "Node.js" Mocha ESLint Prettier npm "GitHub Actions"

# YAML/JSON config file
pnpm check-config -c example-config.yaml

# Save JSON + HTML reports
pnpm check -r "vercel/next.js" -a TypeScript JavaScript React "Next.js" \
  -o all --output-dir ./reports

# Broad allowed-list entries (requires AI credentials in .env.local)
pnpm check -r "owner/repo" -a TypeScript "JavaScript testing tools" --use-ai
```

| Flag | Description |
|---|---|
| `-r, --repo <slug>` | GitHub repository `org/repo` (required for `check`) |
| `-a, --allowed <techs...>` | Allowed technologies (required for `check`) |
| `-c, --config <file>` | YAML or JSON config (for `check-config`) |
| `-o, --output <format>` | `cli`, `json`, `html`, or `all` (default: `cli`) |
| `--output-dir <dir>` | Output directory (default: `./reports`) |
| `-t, --token <token>` | GitHub token (or `GITHUB_TOKEN` env var) |
| `--use-ai` | LLM tie-breaker for broad allowed-list entries only |
| `--strict` | Exit `1` when non-compliant (use in CI; default exits `0` after printing the report) |

### Optional: AI tie-breaker

Configure in `.env.local` (see `.env.example`):

```bash
# OpenAI cloud
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Or local Ollama (free)
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
AI_MODEL=qwen2.5:7b
```

---

## Config file example

```yaml
repository: "vercel/next.js"
allowedTechnologies:
  - TypeScript
  - React
  - Next.js
  - Jest
useAI: false
```

See `example-config.yaml` for a longer example.

---

## How it works (short)

```
GitHub API (manifests + /languages)
        ↓
Deterministic detectors (per ecosystem)
        ↓
Compliance match (alias table + optional AI for broad entries)
        ↓
Report (web / terminal / JSON / HTML)
```

1. **Fetch** indicator files from the repo tree (and language byte stats from GitHub).
2. **Detect** technologies from parsed manifests (high confidence) and language stats (medium/low).
3. **Match** each detected name to your allowed list (exact → implied companions → optional AI for broad entries).
4. **Report** compliance, sources, confidence, and notes.

---

## Project layout

See `src/README.md`. Summary:

```
src/core/     Shared engine (types, github, analyzer)
src/web/      Next.js UI (hooks, components, ReportView)
src/cli/      CLI (terminal, JSON, HTML export)
app/          Next.js routes
```

---

## Example CLI output

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
  Low detection confidence: 0

✓ Allowed Technologies:
  • ESLint [tool] ●●● high (matches: ESLint)
    └─ Source: package.json
  • JavaScript [language] ●●● high (matches: JavaScript)
  • Mocha [tool] ●●● high (matches: Mocha)
  • Node.js [runtime] ●●● high (matches: Node.js)

✗ Not Allowed Technologies:
  • GitHub Actions [tool] ●●● high
    └─ 4 workflow file(s)
```

---

## License

MIT
