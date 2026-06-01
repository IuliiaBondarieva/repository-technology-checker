import { z } from "zod";

export const ConfigSchema = z.object({
  repository: z
    .string()
    .regex(/^[^/]+\/[^/]+$/, "Must be in format 'org/repo'"),
  allowedTechnologies: z
    .array(z.string())
    .min(1, "At least one technology must be allowed"),
  useAI: z.boolean().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export type TechnologyCategory =
  | "language"
  | "framework"
  | "tool"
  | "library"
  | "runtime"
  | "database"
  | "unknown";

export interface DetectedTechnology {
  name: string;
  category: TechnologyCategory;
  confidence: "high" | "medium" | "low";
  source: string;
  reasoning?: string;
}

export interface ComplianceResult {
  technology: DetectedTechnology;
  isAllowed: boolean;
  matchedAllowedTech?: string;
}

export interface AnalysisReport {
  repository: string;
  analyzedAt: string;
  isCompliant: boolean;
  summary: {
    totalDetected: number;
    allowed: number;
    notAllowed: number;
    uncertain: number;
  };
  detectedTechnologies: ComplianceResult[];
  uncertainties: string[];
  assumptions: string[];
  filesAnalyzed: string[];
  errors: string[];
  usedAI: boolean;
}

export interface RepoFile {
  path: string;
  content: string;
}
