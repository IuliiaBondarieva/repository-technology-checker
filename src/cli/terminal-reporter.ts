import chalk from "chalk";
import {
  CONFIDENCE_DOTS,
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
} from "@/src/web/report/confidence";
import type { AnalysisReport, ComplianceResult } from "@/src/core/types";

/** Colorized terminal report for the CLI. */
export function printTerminalReport(report: AnalysisReport): void {
  console.log("\n" + "=".repeat(60));
  console.log(chalk.bold("  TECHNOLOGY STACK COMPLIANCE REPORT"));
  console.log("=".repeat(60) + "\n");

  console.log(chalk.gray("Repository:"), report.repository);
  console.log(chalk.gray("Analyzed at:"), report.analyzedAt);
  console.log(chalk.gray("AI mode:"), formatAiStatus(report));
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
  console.log(
    chalk.yellow(`  Low detection confidence: ${report.summary.uncertain}`),
  );
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
    printTechnologiesTable(allowed, "allowed");
    console.log();
  }

  const notAllowed = report.detectedTechnologies.filter((r) => !r.isAllowed);
  if (notAllowed.length > 0) {
    console.log(chalk.red.bold("✗ Not Allowed Technologies:"));
    printTechnologiesTable(notAllowed, "not-allowed");
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

function printTechnologiesTable(
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
      `  ${colorFn("•")} ${chalk.bold(tech.name)} ${chalk.gray(`[${tech.category}]`)} ${formatConfidence(tech.confidence)}${match}`,
    );
    if (tech.reasoning) {
      console.log(chalk.gray(`    └─ ${tech.reasoning}`));
    }
    console.log(chalk.gray(`    └─ Source: ${tech.source}`));
  }
}

function formatAiStatus(report: AnalysisReport): string {
  if (report.aiInvoked) {
    return chalk.magenta(
      `invoked — ${report.aiMatchCount} match(es) via LLM (look for "(AI)" below)`,
    );
  }
  if (report.usedAI) {
    return chalk.yellow("enabled but not invoked — see Uncertainties");
  }
  return chalk.gray("off (deterministic only)");
}

function formatConfidence(confidence: ConfidenceLevel): string {
  const dots = CONFIDENCE_DOTS[confidence];
  const label = CONFIDENCE_LABEL[confidence];
  const color = confidence === "high" ? chalk.green : chalk.yellow;
  return color(`${dots} ${label}`);
}
