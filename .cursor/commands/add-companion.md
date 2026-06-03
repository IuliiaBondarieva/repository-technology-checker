# Add implied companion (ecosystem rule)

Allow technology **B** when only **A** is on the allowed list (one-way).

## Example

Allowing `Spring Boot` should imply `Maven` → edit `ECOSYSTEM_COMPANIONS` in `src/core/analyzer/ecosystem.ts`.

## Steps

1. Confirm canonical names via `src/core/analyzer/aliases.ts` (detector output must match keys).
2. Add **B** to the array for parent **A** in `ECOSYSTEM_COMPANIONS`.
3. Do **not** add reverse implications (B does not imply A).
4. Smoke test:

```bash
pnpm check -r OWNER/REPO -a "Parent Name"
```

5. Confirm report shows `matches: Parent Name (implied)` for **B**.

## Reply format

- Parent → companions added
- Test command used
- Sample line from report proving `(implied)` works
