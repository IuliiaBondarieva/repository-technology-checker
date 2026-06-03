# Fix CLI or report output

Fix terminal, JSON, or HTML reporting **without** changing detection unless necessary.

## Scope

- `src/cli/cli.ts` — flags, exit codes (`--strict`), errors
- `src/cli/terminal-reporter.ts` — chalk output
- `src/cli/json-reporter.ts` — JSON shape
- `src/cli/HtmlReporter.tsx` — static HTML export
- `src/web/report/ReportView.tsx` — shared UI (keep CLI/HTML/web in sync)

Read `@.cursor/rules/cli.mdc` and `@.cursor/rules/web-ui.mdc`.

## Rules

- `AnalysisReport` in `src/core/types.ts` is the contract — update all consumers if fields change
- Confidence dots ≠ compliance color — do not conflate in copy or styling
- Default exit `0` after successful run; `1` only with `--strict` + non-compliant

## Verify

```bash
pnpm check -r expressjs/express -a JavaScript Express -o all --output-dir ./reports
```

Confirm terminal output and files under `./reports/`.
