# Run web UI locally

Start and verify the Next.js UI for Tech Stack Checker.

## Steps

1. Ensure dependencies: `pnpm install` (if needed).
2. Copy `.env.example` → `.env.local` if missing; set `GITHUB_TOKEN` for private repos.
3. Start dev server:

```bash
pnpm dev
```

4. Tell the user to open http://localhost:3000 — form posts to `/api/analyze` using `src/core`.

## If debugging UI issues

- Form state: `src/web/hooks/useAnalysisForm.ts`
- Report: `src/web/report/ReportView.tsx`
- API: `app/api/analyze/route.ts`

Match CLI behavior; do not duplicate analyzer logic in the client.
