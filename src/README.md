# Source layout

```
src/
├── core/          # Shared analysis engine (no UI)
│   ├── types.ts
│   ├── github/    # Fetch repo manifests + language stats
│   └── analyzer/  # Detect technologies + check compliance
│
├── web/           # Next.js UI only
│   ├── globals.css
│   ├── hooks/     # Client state (useAnalysisForm)
│   ├── components/
│   └── report/    # React report view (ReportView)
│
└── cli/           # Command-line interface only
    ├── cli.ts           # Entry point (commander)
    ├── terminal-reporter.ts
    ├── HtmlReporter.tsx # Reuses web/report/ReportView for HTML files
    └── json-reporter.ts
```

- **Web**: `app/` → imports from `@/src/core` + `@/src/web`
- **CLI**: `pnpm check` → imports from `@/src/core` + `@/src/cli` (HTML export optionally uses `@/src/web/report`)

Agent docs: `AGENTS.md`; rules `.cursor/rules/`; skills `.cursor/skills/`; slash commands `.cursor/commands/` (e.g. `/smoke-test`).
