import type { AnalysisReport } from "@/src/core/types";

export function renderJsonReport(report: AnalysisReport): string {
  return JSON.stringify({ reportVersion: "1.0", ...report }, null, 2);
}
