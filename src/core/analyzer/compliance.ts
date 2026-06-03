// Compliance matching: detected technologies vs. allowed-list entries.
//
// Strategy:
//   1. Canonicalize both sides via the alias table.
//   2. Exact match by canonical name (deterministic, explainable).
//   3. Implied companions (e.g. React → Node.js) when a related framework is allowed.
//   4. For anything still unmatched, if the allowed list contains broad/fuzzy
//      entries ("JavaScript testing tools") AND `useAI` is enabled, ask an
//      LLM to map detected items onto broad entries. This is the *only* place
//      AI is used, and it's opt-in.
//
// Without AI, broad entries simply won't match — which is the safe default
// for a compliance tool.

import { canonicalize, isBroadCategory } from "./aliases";
import { chatJSON } from "./ai";
import { buildImpliedAllowMap } from "./ecosystem";
import type { ComplianceResult, DetectedTechnology } from "../types";

export interface CheckOptions {
  useAI?: boolean;
}

export interface CheckResult {
  results: ComplianceResult[];
  notes: string[];
  aiInvoked: boolean;
  aiMatchCount: number;
  impliedMatchCount: number;
}

export async function checkCompliance(
  detected: DetectedTechnology[],
  allowed: string[],
  options: CheckOptions = {},
): Promise<CheckResult> {
  const notes: string[] = [];

  // Build canonical -> original-entry map for nicer error messages.
  const allowedExact = new Map<string, string>();
  const allowedBroad: string[] = [];
  for (const entry of allowed) {
    if (isBroadCategory(entry)) {
      allowedBroad.push(entry);
    } else {
      allowedExact.set(canonicalize(entry), entry);
    }
  }

  const impliedAllow = buildImpliedAllowMap(allowedExact);
  let impliedMatchCount = 0;

  const results: ComplianceResult[] = detected.map((t) => {
    const exact = allowedExact.get(t.name);
    if (exact) {
      return {
        technology: t,
        isAllowed: true,
        matchedAllowedTech: exact,
      };
    }

    const impliedFrom = impliedAllow.get(t.name);
    if (impliedFrom) {
      impliedMatchCount++;
      return {
        technology: t,
        isAllowed: true,
        matchedAllowedTech: `${impliedFrom} (implied)`,
      };
    }

    return {
      technology: t,
      isAllowed: false,
      matchedAllowedTech: undefined,
    };
  });

  // Optional AI tie-breaker for broad-category entries.
  const unmatched = results.filter((r) => !r.isAllowed);
  let aiInvoked = false;
  let aiMatchCount = 0;

  if (options.useAI && allowedBroad.length === 0) {
    notes.push(
      "AI was enabled but not used: no broad allowed-list entries " +
        "(e.g. \"Python web frameworks\"). Add a multi-word or category-style entry, or use exact names.",
    );
  } else if (options.useAI && unmatched.length === 0) {
    notes.push(
      "AI was enabled but not used: every detected technology already matched the allowed list deterministically.",
    );
  }

  if (unmatched.length > 0 && allowedBroad.length > 0) {
    if (options.useAI) {
      try {
        aiInvoked = true;
        const aiMatches = await broadMatchWithAI(
          unmatched.map((r) => r.technology),
          allowedBroad,
        );
        for (const r of unmatched) {
          const match = aiMatches[r.technology.name];
          if (match) {
            r.isAllowed = true;
            r.matchedAllowedTech = `${match} (AI)`;
            aiMatchCount++;
          }
        }
        notes.push(
          `AI tie-breaker invoked: ${aiMatchCount} of ${unmatched.length} unmatched ` +
            `technologies matched broad allowed-list entries.`,
        );
      } catch (err) {
        aiInvoked = false;
        notes.push(
          `AI tie-breaker failed: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    } else {
      notes.push(
        `${allowedBroad.length} broad allowed-list entries were not evaluated ` +
          `(${allowedBroad.join("; ")}). Re-run with --use-ai to let an LLM ` +
          `decide whether unmatched technologies belong to those categories.`,
      );
    }
  }

  if (impliedMatchCount > 0) {
    notes.push(
      `${impliedMatchCount} technology(ies) allowed as implied companions of entries on your list (see "(implied)" in matches).`,
    );
  }

  return { results, notes, aiInvoked, aiMatchCount, impliedMatchCount };
}

async function broadMatchWithAI(
  unmatched: DetectedTechnology[],
  broadEntries: string[],
): Promise<Record<string, string>> {
  const payload = {
    detected: unmatched.map((t) => ({ name: t.name, category: t.category })),
    broadAllowedEntries: broadEntries,
  };

  const system =
    "You decide whether detected technologies belong to broad allowed-list " +
    "entries. Be strict: only match when the entry clearly covers the " +
    "technology. Return JSON of the form " +
    `{"matches": [{"detected": "<name>", "matchedEntry": "<entry>"}]}. ` +
    "Omit detected items that don't match any entry. No prose.";

  type AIResponse = {
    matches?: Array<{ detected?: string; matchedEntry?: string }>;
  };

  const data = await chatJSON<AIResponse>({
    system,
    user: JSON.stringify(payload),
  });

  const out: Record<string, string> = {};
  for (const m of data.matches ?? []) {
    if (m.detected && m.matchedEntry && broadEntries.includes(m.matchedEntry)) {
      out[m.detected] = m.matchedEntry;
    }
  }
  return out;
}
