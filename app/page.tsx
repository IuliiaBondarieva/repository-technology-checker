"use client";

import Image from "next/image";
import { Loader2, XCircle, Plus, X, Sparkles } from "lucide-react";

import { Button } from "@/src/web/components/ui/Button";
import { Input } from "@/src/web/components/ui/Input";
import { Label } from "@/src/web/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/web/components/ui/Card";
import { Badge } from "@/src/web/components/ui/Badge";
import { GitHubIcon } from "@/src/web/components/GitHubIcon";
import { ReportView } from "@/src/web/report/ReportView";
import { useAnalysisForm } from "@/src/web/hooks/useAnalysisForm";

export default function Page() {
  const {
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
  } = useAnalysisForm();

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold tracking-tight">
            <Image
              src="/icon-light-transparent-bg.svg"
              alt=""
              width={32}
              height={32}
              className="inline-block shrink-0"
              aria-hidden
            />
            Tech Stack Checker
          </h1>
          <p className="text-muted-foreground">
            Analyze GitHub repositories for technology compliance
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitHubIcon className="h-5 w-5" />
              Repository Analysis
            </CardTitle>
            <CardDescription>
              Detection is deterministic — based on manifest files and
              GitHub&apos;s language stats. AI is only used (optionally) for
              fuzzy allowed-list entries like &quot;JavaScript testing
              tools&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repo">GitHub Repository</Label>
              <Input
                id="repo"
                placeholder="owner/repo (e.g., vercel/next.js)"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Allowed Technologies</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add technology..."
                  value={allowedInput}
                  onChange={(e) => setAllowedInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTech()}
                />
                <Button onClick={addTech} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {allowedTech.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button
                      onClick={() => removeTech(t)}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove ${t}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="h-4 w-4"
              />
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>
                Use AI to match unresolved items against broad allowed-list
                entries
              </span>
            </label>

            <Button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Repository"
              )}
            </Button>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span>{errorMessage}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {report && <ReportView report={report} />}
      </div>
    </main>
  );
}
