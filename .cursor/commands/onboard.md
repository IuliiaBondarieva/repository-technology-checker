# Onboard to this codebase

Give a short tour for someone new to **Tech Stack Checker**.

## Read first

- `@AGENTS.md`
- `@README.md` (capabilities and limitations)
- `@src/README.md` (folder layout)

## Explain (concise)

1. **Purpose** — GitHub repo + allowed tech list → compliance report
2. **Layers** — `src/core` (engine), `src/web` + `app` (UI), `src/cli` (CLI)
3. **Pipeline** — fetch manifests → detectors → compliance (exact → implied → optional AI)
4. **Daily commands** — `pnpm dev`, `pnpm check`, `pnpm check-config`, `pnpm lint`, `pnpm build`
5. **AI artifacts** — `.cursor/rules/`, `.cursor/skills/`, `.cursor/commands/` (type `/` to list commands)

## Offer next actions

Suggest which slash command fits their goal: `/check-repo`, `/extend-analyzer`, `/smoke-test`, `/dev-web`.

Do not implement features unless they ask.
