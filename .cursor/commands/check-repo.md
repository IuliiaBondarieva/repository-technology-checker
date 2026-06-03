# Check a GitHub repo against an allowed stack

Run a compliance check for **this project’s CLI** and summarize the report.

## Inputs (ask if missing)

1. **Repository** — `owner/repo` (GitHub only)
2. **Allowed technologies** — comma-separated or list (quote multi-word names, e.g. `"Spring Boot"`)

Optional: `--use-ai` only if the allowed list has **broad** entries (e.g. `"Python web frameworks"`).

## Steps

1. Run from repo root:

```bash
pnpm check -r OWNER/REPO -a "Tech1" "Tech2" ...
```

Use `.env.local` for `GITHUB_TOKEN` if the repo is private or rate-limited.

2. Interpret the report for the user:

- **Compliant** vs **non-compliant**
- Rows with `(implied)` — allowed via `src/core/analyzer/ecosystem.ts`
- Rows with `(AI)` — LLM matched a broad allowed entry
- **AI mode** line — `invoked` vs `enabled but not invoked`
- Detection dots (●●● / ●●○ / ●○○) vs row allowed/not allowed

3. If they need CI to fail on non-compliance, mention re-running with `--strict`.

Do not change code unless they ask to fix detection or companions.
