// Detection confidence — how sure we are that this technology is present.
// This is separate from compliance (allowed vs not allowed).

export type ConfidenceLevel = "high" | "medium" | "low";

export const CONFIDENCE_DOTS: Record<ConfidenceLevel, string> = {
  high: "●●●",
  medium: "●●○",
  low: "●○○",
};

export const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  high: "text-green-600",
  medium: "text-amber-600",
  low: "text-amber-700",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CONFIDENCE_DESCRIPTION: Record<ConfidenceLevel, string> = {
  high: "Clear evidence (e.g. explicit dependency or config file)",
  medium: "Strong indicators, but not definitive",
  low: "Inferred or weak signal — verify manually",
};

export const CONFIDENCE_LEGEND = [
  { level: "high" as const, dots: CONFIDENCE_DOTS.high },
  { level: "medium" as const, dots: CONFIDENCE_DOTS.medium },
  { level: "low" as const, dots: CONFIDENCE_DOTS.low },
];
