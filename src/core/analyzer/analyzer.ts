// Orchestrator: pulls files, runs deterministic detectors, then optionally
// asks an LLM to resolve broad allowed-list entries.
//
// Kept deliberately thin — the interesting logic lives in detectors.ts and
// compliance.ts so each piece can be reviewed and tested in isolation.

import { runDetectors } from "./detectors";
import { checkCompliance } from "./compliance";
import type {
  AnalysisReport,
  ComplianceResult,
  RepoFile,
} from "../types";

export interface AnalyzeInput {
  repository: string;
  files: RepoFile[];
  githubLanguageBytes: Record<string, number>;
  allowedTechnologies: string[];
  useAI?: boolean;
}

export async function analyze(input: AnalyzeInput): Promise<AnalysisReport> {
  const detected = runDetectors(input.files, input.githubLanguageBytes);

  const { results, notes, aiInvoked, aiMatchCount, impliedMatchCount } =
    await checkCompliance(detected, input.allowedTechnologies, {
      useAI: input.useAI,
    });

  return buildReport({
    repository: input.repository,
    results,
    filesAnalyzed: input.files.map((f) => f.path),
    notes,
    useAI: input.useAI ?? false,
    aiInvoked,
    aiMatchCount,
    impliedMatchCount,
  });
}

function buildReport(args: {
  repository: string;
  results: ComplianceResult[];
  filesAnalyzed: string[];
  notes: string[];
  useAI: boolean;
  aiInvoked: boolean;
  aiMatchCount: number;
  impliedMatchCount: number;
}): AnalysisReport {
  const allowed = args.results.filter((r) => r.isAllowed);
  const notAllowed = args.results.filter((r) => !r.isAllowed);
  const uncertain = args.results.filter(
    (r) => r.technology.confidence === "low",
  );

  const aiInfoNotes = args.notes.filter((n) =>
    /^AI (was enabled|tie-breaker invoked)/.test(n),
  );
  const impliedInfoNotes = args.notes.filter((n) =>
    /implied companions/.test(n),
  );
  const warningNotes = args.notes.filter(
    (n) => !aiInfoNotes.includes(n) && !impliedInfoNotes.includes(n),
  );

  const uncertainties: string[] = [
    ...warningNotes,
    ...uncertain.map(
      (r) =>
        `Low confidence: ${r.technology.name} detected from ${r.technology.source}` +
        (r.technology.reasoning ? ` (${r.technology.reasoning})` : ""),
    ),
  ];

  const assumptions = [
    "Analysis is limited to manifest/configuration files and GitHub's language byte stats.",
    "Library-level dependencies are intentionally not enumerated; only languages, frameworks, and tools.",
    ...impliedInfoNotes,
    ...(args.useAI ? aiInfoNotes : []),
    args.aiInvoked
      ? `An LLM matched ${args.aiMatchCount} technology(ies) to broad allowed-list entries (see "(AI)" in matches).`
      : !args.useAI
        ? "Broad allowed-list entries (e.g. 'JavaScript ecosystem') were not evaluated; pass --use-ai to enable that."
        : aiInfoNotes.length === 0
          ? "AI was requested (--use-ai) but no LLM call was made."
          : "",
  ].filter(Boolean);

  return {
    repository: args.repository,
    analyzedAt: new Date().toISOString(),
    isCompliant: notAllowed.length === 0,
    summary: {
      totalDetected: args.results.length,
      allowed: allowed.length,
      notAllowed: notAllowed.length,
      uncertain: uncertain.length,
    },
    detectedTechnologies: args.results,
    uncertainties,
    assumptions,
    filesAnalyzed: args.filesAnalyzed,
    errors: [],
    usedAI: args.useAI,
    aiInvoked: args.aiInvoked,
    aiMatchCount: args.aiMatchCount,
  };
}
