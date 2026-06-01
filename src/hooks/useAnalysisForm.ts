import { useState } from "react";
import type { AnalysisReport } from "@/src/types";

const DEFAULT_ALLOWED_TECH = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
];

export function useAnalysisForm() {
  const [repository, setRepository] = useState("");
  const [allowedInput, setAllowedInput] = useState("");
  const [allowedTech, setAllowedTech] = useState<string[]>(DEFAULT_ALLOWED_TECH);
  const [useAI, setUseAI] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addTech = () => {
    const technology = allowedInput.trim();
    if (technology && !allowedTech.includes(technology)) {
      setAllowedTech([...allowedTech, technology]);
    }
    setAllowedInput("");
  };

  const removeTech = (technology: string) => {
    setAllowedTech(allowedTech.filter((t) => t !== technology));
  };

  const handleAnalyze = async () => {
    if (!repository || allowedTech.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository,
          allowedTechnologies: allowedTech,
          useAI,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setReport(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = !isLoading && !!repository && allowedTech.length > 0;

  return {
    repository,
    setRepository,
    allowedInput,
    setAllowedInput,
    allowedTech,
    addTech,
    removeTech,
    useAI,
    setUseAI,
    report,
    isLoading,
    errorMessage,
    handleAnalyze,
    canAnalyze,
  };
}
