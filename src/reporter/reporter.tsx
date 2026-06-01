import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import chalk from "chalk";
import { ReportView } from "./ReportView";
import {
  CONFIDENCE_DOTS,
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
} from "./confidence";
import type { AnalysisReport, ComplianceResult } from "../types";

// Resolve the project's globals.css at runtime so the standalone HTML report
// inherits the same theme as the web UI without us having to hand-maintain
// a parallel stylesheet.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedGlobalsCss: string | null = null;
function getGlobalsCss(): string {
  if (cachedGlobalsCss !== null) return cachedGlobalsCss;
  try {
    cachedGlobalsCss = fs.readFileSync(
      path.resolve(__dirname, "../../app/globals.css"),
      "utf-8",
    );
  } catch {
    cachedGlobalsCss = "";
  }
  return cachedGlobalsCss;
}

export class Reporter {
  printCliReport(report: AnalysisReport): void {
    console.log("\n" + "=".repeat(60));
    console.log(chalk.bold("  TECHNOLOGY STACK COMPLIANCE REPORT"));
    console.log("=".repeat(60) + "\n");

    console.log(chalk.gray("Repository:"), report.repository);
    console.log(chalk.gray("Analyzed at:"), report.analyzedAt);
    console.log();

    if (report.isCompliant) {
      console.log(
        chalk.bgGreen.black.bold(" ✓ COMPLIANT ") +
          chalk.green(" All detected technologies are allowed"),
      );
    } else {
      console.log(
        chalk.bgRed.white.bold(" ✗ NON-COMPLIANT ") +
          chalk.red(" Some technologies are not in the allowed list"),
      );
    }
    console.log();

    console.log(chalk.bold("Summary:"));
    console.log(`  Total technologies detected: ${report.summary.totalDetected}`);
    console.log(chalk.green(`  Allowed: ${report.summary.allowed}`));
    console.log(chalk.red(`  Not allowed: ${report.summary.notAllowed}`));
    console.log(chalk.yellow(`  Low detection confidence: ${report.summary.uncertain}`));
    console.log();
    console.log(
      chalk.gray(
        "  Detection confidence (separate from allowed/not allowed): " +
          "●●● high · ●●○ medium · ●○○ low",
      ),
    );
    console.log();

    const allowed = report.detectedTechnologies.filter((r) => r.isAllowed);
    if (allowed.length > 0) {
      console.log(chalk.green.bold("✓ Allowed Technologies:"));
      this.printTechnologiesTable(allowed, "allowed");
      console.log();
    }

    const notAllowed = report.detectedTechnologies.filter((r) => !r.isAllowed);
    if (notAllowed.length > 0) {
      console.log(chalk.red.bold("✗ Not Allowed Technologies:"));
      this.printTechnologiesTable(notAllowed, "not-allowed");
      console.log();
    }

    if (report.uncertainties.length > 0) {
      console.log(chalk.yellow.bold("⚠ Uncertainties:"));
      report.uncertainties.forEach((u) => console.log(chalk.yellow(`  • ${u}`)));
      console.log();
    }

    if (report.assumptions.length > 0) {
      console.log(chalk.blue.bold("ℹ Assumptions:"));
      report.assumptions.forEach((a) => console.log(chalk.blue(`  • ${a}`)));
      console.log();
    }

    console.log(chalk.gray.bold("Files Analyzed:"));
    report.filesAnalyzed.forEach((f) => console.log(chalk.gray(`  • ${f}`)));
    console.log();

    if (report.errors.length > 0) {
      console.log(chalk.red.bold("Errors:"));
      report.errors.forEach((e) => console.log(chalk.red(`  • ${e}`)));
      console.log();
    }

    console.log("=".repeat(60) + "\n");
  }

  private printTechnologiesTable(
    results: ComplianceResult[],
    type: "allowed" | "not-allowed",
  ): void {
    const colorFn = type === "allowed" ? chalk.green : chalk.red;
    for (const result of results) {
      const tech = result.technology;
      const match =
        type === "allowed" && result.matchedAllowedTech
          ? chalk.gray(` (matches: ${result.matchedAllowedTech})`)
          : "";
      console.log(
        `  ${colorFn("•")} ${chalk.bold(tech.name)} ${chalk.gray(`[${tech.category}]`)} ${this.formatConfidence(tech.confidence)}${match}`,
      );
      if (tech.reasoning) {
        console.log(chalk.gray(`    └─ ${tech.reasoning}`));
      }
      console.log(chalk.gray(`    └─ Source: ${tech.source}`));
    }
  }

  private formatConfidence(confidence: ConfidenceLevel): string {
    const dots = CONFIDENCE_DOTS[confidence];
    const label = CONFIDENCE_LABEL[confidence];
    const color =
      confidence === "high"
        ? chalk.green
        : confidence === "medium"
          ? chalk.yellow
          : chalk.yellow; // low = uncertain detection, not "bad"
    return color(`${dots} ${label}`);
  }

  toJson(report: AnalysisReport): string {
    return JSON.stringify({ reportVersion: "1.0", ...report }, null, 2);
  }

  toHtml(report: AnalysisReport): string {
    const html = renderToStaticMarkup(
      <ReportDocument report={report} css={getGlobalsCss()} />,
    );
    return `<!DOCTYPE html>${html}`;
  }
}

/**
 * Full HTML document wrapper for the standalone report. Loads Tailwind v4
 * via its browser script so the same utility classes used in the web UI
 * resolve here too; inlines the project's globals.css so the OKLCH theme
 * variables match.
 */
function ReportDocument({
  report,
  css,
}: {
  report: AnalysisReport;
  css: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Tech Stack Compliance Report — ${report.repository}`}</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <main className="min-h-screen py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Tech Stack Compliance Report
              </h1>
              <p className="text-muted-foreground">
                <strong>{report.repository}</strong> · {report.analyzedAt}
              </p>
            </div>
            <ReportView report={report} />
          </div>
        </main>
      </body>
    </html>
  );
}
