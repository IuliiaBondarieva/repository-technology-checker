// Web UI report component. Also used by the CLI HTML exporter (src/cli/HtmlReporter.tsx).

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/src/web/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/web/components/ui/Card";
import type { AnalysisReport, ComplianceResult } from "@/src/core/types";
import {
  CONFIDENCE_COLOR,
  CONFIDENCE_DESCRIPTION,
  CONFIDENCE_DOTS,
  CONFIDENCE_LABEL,
  CONFIDENCE_LEGEND,
  type ConfidenceLevel,
} from "./confidence";

export function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-6">
      <Card
        className={report.isCompliant ? "border-green-500" : "border-red-500"}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <StatusIcon
              icon={report.isCompliant ? CheckCircle2 : XCircle}
              className={
                report.isCompliant ? "text-green-500" : "text-red-500"
              }
            />
            <div>
              <h2 className="text-xl font-semibold">
                {report.isCompliant ? "Compliant" : "Non-Compliant"}
              </h2>
              <p className="text-muted-foreground">
                {report.isCompliant
                  ? "All detected technologies are in the allowed list"
                  : "Some technologies are not in the allowed list"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">AI: </span>
        {report.aiInvoked
          ? `LLM invoked — ${report.aiMatchCount} match(es); look for “(AI)” in allowed rows.`
          : report.usedAI
            ? "Enabled but not invoked — see Notes below."
            : "Off (deterministic matching only)."}
      </p>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total Detected" value={report.summary.totalDetected} />
        <Stat
          label="Allowed"
          value={report.summary.allowed}
          color="text-green-600"
        />
        <Stat
          label="Not Allowed"
          value={report.summary.notAllowed}
          color="text-red-600"
        />
        <Stat
          label="Uncertain"
          value={report.summary.uncertain}
          color="text-yellow-600"
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Detected Technologies</CardTitle>
          <ConfidenceLegend />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.detectedTechnologies.map((result, i) => (
              <TechRow key={i} result={result} />
            ))}
          </div>
        </CardContent>
      </Card>

      {(report.uncertainties.length > 0 || report.assumptions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.uncertainties.length > 0 && (
              <NoteList title="Uncertainties" items={report.uncertainties} />
            )}
            {report.assumptions.length > 0 && (
              <NoteList title="Assumptions" items={report.assumptions} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Files Analyzed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {report.filesAnalyzed.map((f, i) => (
              <Badge key={i} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.errors.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <NoteList title="" items={report.errors} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className: string;
}) {
  return <Icon className={`h-8 w-8 ${className}`} />;
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ConfidenceLegend() {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-2">
      <p>
        <span className="font-medium text-foreground">Detection confidence</span>{" "}
        — how sure we are this technology is present. This is separate from
        whether it is allowed (green/red row background).
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {CONFIDENCE_LEGEND.map(({ level, dots }) => (
          <li key={level} className="flex items-center gap-1.5">
            <span
              className={CONFIDENCE_COLOR[level]}
              aria-hidden
            >
              {dots}
            </span>
            <span>
              {CONFIDENCE_LABEL[level]} — {CONFIDENCE_DESCRIPTION[level]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-normal"
      title={CONFIDENCE_DESCRIPTION[level]}
    >
      <span className={CONFIDENCE_COLOR[level]} aria-hidden>
        {CONFIDENCE_DOTS[level]}
      </span>
      <span className="text-muted-foreground">
        Detection: {CONFIDENCE_LABEL[level]}
      </span>
    </Badge>
  );
}

function TechRow({ result }: { result: ComplianceResult }) {
  const t = result.technology;
  return (
    <div
      className={`p-4 rounded-lg border ${
        result.isAllowed
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {result.isAllowed ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <div className="min-w-0">
            <div className="font-medium">{t.name}</div>
            <div className="text-sm text-muted-foreground">
              {t.category} · Source: {t.source}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <ConfidenceBadge level={t.confidence} />
          {result.matchedAllowedTech && (
            <Badge variant="outline">
              Allowed: {result.matchedAllowedTech}
            </Badge>
          )}
        </div>
      </div>
      {t.reasoning && (
        <p className="mt-2 text-sm text-muted-foreground pl-8">{t.reasoning}</p>
      )}
    </div>
  );
}

function NoteList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      {title && <h4 className="font-medium mb-2">{title}</h4>}
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
