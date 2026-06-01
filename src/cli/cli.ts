#!/usr/bin/env node

import { Command } from "commander";
import { parse as parseYaml } from "yaml";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";

import { GitHubClient } from "../github/github";
import { analyze } from "../analyzer/analyzer";
import { Reporter } from "../reporter/reporter";
import { ConfigSchema, type Config } from "../types";

interface RunOptions {
  output: string;
  outputDir: string;
  token?: string;
  useAI: boolean;
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
    spinner.succeed(
      `Detected ${report.summary.totalDetected} technologies`,
    );

    await emit(report, opts, owner, repo);
    process.exit(report.isCompliant ? 0 : 1);
  } catch (error) {
    spinner.fail("Analysis failed");
    console.error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
    process.exit(2);
  }
}

async function emit(
  report: Awaited<ReturnType<typeof analyze>>,
  opts: RunOptions,
  owner: string,
  repo: string,
): Promise<void> {
  const reporter = new Reporter();
  const formats = opts.output === "all" ? ["cli", "json", "html"] : [opts.output];
  for (const format of formats) {
    if (format === "cli") {
      reporter.printCliReport(report);
    } else if (format === "json") {
      await fs.mkdir(opts.outputDir, { recursive: true });
      const file = path.join(opts.outputDir, `${owner}-${repo}-report.json`);
      await fs.writeFile(file, reporter.toJson(report));
      console.log(`JSON report saved to: ${file}`);
    } else if (format === "html") {
      await fs.mkdir(opts.outputDir, { recursive: true });
      const file = path.join(opts.outputDir, `${owner}-${repo}-report.html`);
      await fs.writeFile(file, reporter.toHtml(report));
      console.log(`HTML report saved to: ${file}`);
    }
  }
}

program.parse();
