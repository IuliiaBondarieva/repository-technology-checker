# Smoke test (lint, build, sample check)

Verify the project still works after changes.

## Run (repo root)

```bash
pnpm lint    # tsc --noEmit
pnpm build
pnpm check -r expressjs/express -a JavaScript Node.js Express Mocha ESLint npm
```

If any command fails, fix the issue and re-run the failed step(s).

## Report back

- Pass/fail per command
- One-line summary of the sample check (compliant or not; anything surprising in detected tech)

Follow `@.cursor/rules/project-core.mdc` — keep fixes minimal and in the right layer (`src/core` vs `src/web` vs `src/cli`).
