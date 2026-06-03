#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { parse as parseYaml } from "yaml";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";

import { GitHubClient } from "@/src/core/github";
import { analyze } from "@/src/core/analyzer";
import { ConfigSchema, type Config } from "@/src/core/types";
import { printTerminalReport } from "./terminal-reporter";
import { renderHtmlReport } from "./HtmlReporter";
import { renderJsonReport } from "./json-reporter";

interface RunOptions {
  output: string;
  outputDir: string;
  token?: string;
  useAI: boolean;
  /** When true, exit 1 if the repo is non-compliant (for CI). Default: false. */
  strict: boolean;
}

const program = new Command();

program
  .name("tech-stack-checker")
  .description("Check if a repository uses only allowed technologies")
  .version("2.0.0");

program
  .command("check")
  .description("Analyze a repository for technology compliance")
  .requiredOption("-r, --repo <slug>", "GitHub repository (org/repo)")
  .requiredOption("-a, --allowed <techs...>", "List of allowed technologies")
  .option("-o, --output <format>", "Output format: cli, json, html, all", "cli")
  .option("--output-dir <dir>", "Directory for output files", "./reports")
  .option("-t, --token <token>", "GitHub token (or set GITHUB_TOKEN env var)")
  .option(
    "--use-ai",
    "Use an LLM to match unresolved items against broad allowed-list entries",
    false,
  )
  .option(
    "--strict",
    "Exit with code 1 when non-compliant (for CI pipelines)",
    false,
  )
  .action(async (opts) => {
    const config = ConfigSchema.parse({
      repository: opts.repo,
      allowedTechnologies: opts.allowed,
      useAI: opts.useAi,
    });
    await run(config, {
      output: opts.output,
      outputDir: opts.outputDir,
      token: opts.token,
      useAI: !!opts.useAi,
      strict: !!opts.strict,
    });
  });

program
  .command("check-config")
  .description("Analyze a repository using a YAML/JSON config file")
  .requiredOption("-c, --config <file>", "Path to YAML/JSON config file")
  .option("-o, --output <format>", "Output format: cli, json, html, all", "cli")
  .option("--output-dir <dir>", "Directory for output files", "./reports")
  .option("-t, --token <token>", "GitHub token (or set GITHUB_TOKEN env var)")
  .option(
    "--use-ai",
    "Use an LLM to match unresolved items against broad allowed-list entries",
    false,
  )
  .option(
    "--strict",
    "Exit with code 1 when non-compliant (for CI pipelines)",
    false,
  )
  .action(async (opts) => {
    const content = await fs.readFile(opts.config, "utf-8");
    const raw = opts.config.endsWith(".json")
      ? JSON.parse(content)
      : parseYaml(content);
    const config = ConfigSchema.parse({
      ...raw,
      useAI: raw.useAI ?? !!opts.useAi,
    });
    await run(config, {
      output: opts.output,
      outputDir: opts.outputDir,
      token: opts.token,
      useAI: config.useAI ?? false,
      strict: !!opts.strict,
    });
  });

async function run(config: Config, opts: RunOptions): Promise<void> {
  const spinner = ora();
  try {
    const token = opts.token ?? process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn(
        "Warning: No GitHub token provided. API rate limits may apply.",
      );
    }
    const [owner, repo] = config.repository.split("/");
    const github = new GitHubClient(token);

    spinner.start("Fetching repository files...");
    const [files, languageBytes] = await Promise.all([
      github.getRepoFiles(owner, repo),
      github.getLanguageBytes(owner, repo),
    ]);
    spinner.succeed(`Fetched ${files.length} indicator files`);

    spinner.start(
      opts.useAI
        ? "Detecting technologies (deterministic + AI tie-breaker)..."
        : "Detecting technologies (deterministic)...",
    );
    const report = await analyze({
      repository: config.repository,
      files,
      githubLanguageBytes: languageBytes,
      allowedTechnologies: config.allowedTechnologies,
      useAI: opts.useAI,
    });
    spinner.succeed(`Detected ${report.summary.totalDetected} technologies`);

    await emitReport(report, opts, owner, repo);

    if (!report.isCompliant && opts.strict) {
      console.log(
        chalk.yellow(
          "\nNon-compliant (--strict): exiting with code 1 for CI.",
        ),
      );
      process.exit(1);
    }
    if (!report.isCompliant) {
      console.log(
        chalk.gray(
          "\nNon-compliant result shown above. Command finished successfully (exit 0). " +
            "Use --strict to fail CI when non-compliant.",
        ),
      );
    }
    process.exit(0);
  } catch (error) {
    spinner.fail("Analysis failed");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(message);
    if (/not found on GitHub/i.test(message) && !process.env.GITHUB_TOKEN) {
      console.error(
        "\nTip: This project only analyzes repos on GitHub. If the repo is local-only, push it first:\n" +
          "  git add . && git commit -m \"Initial commit\" && git push -u origin main\n",
      );
    }
    process.exit(2);
  }
}

async function emitReport(
  report: Awaited<ReturnType<typeof analyze>>,
  opts: RunOptions,
  owner: string,
  repo: string,
): Promise<void> {
  const formats = opts.output === "all" ? ["cli", "json", "html"] : [opts.output];
  for (const format of formats) {
    if (format === "cli") {
      printTerminalReport(report);
    } else if (format === "json") {
      await fs.mkdir(opts.outputDir, { recursive: true });
      const file = path.join(opts.outputDir, `${owner}-${repo}-report.json`);
      await fs.writeFile(file, renderJsonReport(report));
      console.log(`JSON report saved to: ${file}`);
    } else if (format === "html") {
      await fs.mkdir(opts.outputDir, { recursive: true });
      const file = path.join(opts.outputDir, `${owner}-${repo}-report.html`);
      await fs.writeFile(file, renderHtmlReport(report));
      console.log(`HTML report saved to: ${file}`);
    }
  }
}

program.parse();
