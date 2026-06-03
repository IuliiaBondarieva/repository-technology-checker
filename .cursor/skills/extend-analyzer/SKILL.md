---
name: extend-analyzer
description: >-
  Add or change technology detection, aliases, ecosystem companions, or GitHub
  file fetching in Tech Stack Checker. Use when supporting a new manifest,
  framework, AI coding artifact detection, or allowed-list matching behavior.
---

# Extend analyzer

## 1. New detection from manifests

**File:** `src/core/analyzer/detectors.ts`

- Add a `detectX(input: DetectorInput)` function
- Register in `DETECTORS` array
- Use `tech(name, category, confidence, source, reasoning?)` — names are canonicalized via `aliases.ts`

**File:** `src/core/github/github.ts`

- Add basename to `INDICATOR_FILES`, or extend tree loop (e.g. path prefix like `.github/workflows/`)
- Respect `FILE_FETCH_LIMIT` (40); document truncation if many new paths

## 2. Aliases

**File:** `src/core/analyzer/aliases.ts`

- Add lowercase keys in `ALIAS_TO_CANONICAL`
- Detector output and user allowed list must converge on the same **canonical** string

## 3. Implied companions (React → Node.js)

**File:** `src/core/analyzer/ecosystem.ts`

- Add entry to `ECOSYSTEM_COMPANIONS`: parent canonical → array of companion canonicals
- One-way only; explicit allowed names override implied

## 4. Broad categories + AI

**File:** `src/core/analyzer/aliases.ts` — `isBroadCategory()`

Broad markers: `tools`, `frameworks`, `ecosystem`, `stack`, etc., or 3+ word descriptive entries.

**File:** `src/core/analyzer/compliance.ts` — only unmatched + broad + `useAI` calls `broadMatchWithAI`.

## 5. Report contract

**File:** `src/core/types.ts` — `AnalysisReport`, `DetectedTechnology`

If adding fields, update:

- `src/core/analyzer/analyzer.ts` (`buildReport`)
- `src/web/report/ReportView.tsx`
- `src/cli/terminal-reporter.ts`

## 6. AI coding artifacts (optional detector)

To detect Cursor/agent setup in **analyzed repos** (not this repo’s docs):

- Fetch paths: `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursor/skills/**/SKILL.md`
- Emit tools e.g. `Cursor Rules`, `Cursor Skills`, `AGENTS.md` with high confidence when paths exist

## Checklist before finishing

- [ ] Canonical name consistent in detector + aliases
- [ ] GitHub fetch includes new indicator paths
- [ ] README limitations updated if behavior changes
- [ ] `pnpm check` smoke test on a known public repo
