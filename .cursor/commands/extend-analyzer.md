# Extend analyzer (detection / aliases / companions)

Implement a change to **what technologies are detected** or **how the allowed list matches**.

## Required reading

1. `@.cursor/skills/extend-analyzer/SKILL.md` — follow its checklist end-to-end
2. `@AGENTS.md` — layer boundaries
3. `@.cursor/rules/analyzer.mdc` — when editing `src/core/`

## Workflow

1. Clarify the exact technology or behavior (canonical name, manifest signal, implied parent).
2. Edit the minimal files:
   - Detection → `src/core/analyzer/detectors.ts` + `src/core/github/github.ts` fetch list
   - Spelling / aliases → `src/core/analyzer/aliases.ts`
   - Parent → companions → `src/core/analyzer/ecosystem.ts`
   - Report shape → `src/core/types.ts`, `ReportView`, `terminal-reporter.ts`
3. Run `/smoke-test` (or the three commands from that skill).
4. Reply with **Skill checklist** from extend-analyzer (checked items) and files changed.

## Do not

- Put detection logic in `app/` or `src/cli/`
- Use AI for detection (AI is only for broad allowed-list matching in `compliance.ts`)
