// Deterministic technology detectors.
//
// Each detector inspects the file map (and optionally the GitHub language byte
// stats) and emits a list of DetectedTechnology. They are intentionally small
// and best-effort: we'd rather miss an exotic library than hallucinate one.
//
// New ecosystems can be added by writing another small `detect*` function and
// appending it to the `DETECTORS` list at the bottom.

import { parse as parseYaml } from "yaml";
import { canonicalize } from "./aliases";
import type { DetectedTechnology, RepoFile } from "../types";

export interface DetectorInput {
  files: Map<string, string>; // path => content
  githubLanguageBytes: Record<string, number>;
}

type Detector = (input: DetectorInput) => DetectedTechnology[];

// -------------------------------------------------------------------------- //
// Helpers                                                                    //
// -------------------------------------------------------------------------- //

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

function findFile(
  files: Map<string, string>,
  name: string,
): [string, string] | undefined {
  for (const [path, content] of files) {
    if (basename(path) === name) return [path, content];
  }
  return undefined;
}

function findAll(
  files: Map<string, string>,
  name: string,
): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (const [path, content] of files) {
    if (basename(path) === name) result.push([path, content]);
  }
  return result;
}

function tech(
  name: string,
  category: DetectedTechnology["category"],
  confidence: DetectedTechnology["confidence"],
  source: string,
  reasoning?: string,
): DetectedTechnology {
  return { name: canonicalize(name), category, confidence, source, reasoning };
}

// Map of common JS/TS dependency names => detected technology spec.
// Confidence is `high` for direct dep presence; the analyzer can downgrade
// later if needed.
const JS_DEP_MAP: Array<{
  matcher: (dep: string) => boolean;
  name: string;
  category: DetectedTechnology["category"];
}> = [
  { matcher: (d) => d === "typescript", name: "TypeScript", category: "language" },
  { matcher: (d) => d === "react" || d === "react-dom", name: "React", category: "framework" },
  { matcher: (d) => d === "next", name: "Next.js", category: "framework" },
  { matcher: (d) => d === "vue", name: "Vue", category: "framework" },
  { matcher: (d) => d === "nuxt", name: "Nuxt", category: "framework" },
  { matcher: (d) => d === "svelte" || d === "@sveltejs/kit", name: "Svelte", category: "framework" },
  { matcher: (d) => d === "@angular/core", name: "Angular", category: "framework" },
  { matcher: (d) => d === "solid-js", name: "Solid", category: "framework" },
  { matcher: (d) => d === "@remix-run/react", name: "Remix", category: "framework" },
  { matcher: (d) => d === "astro", name: "Astro", category: "framework" },
  { matcher: (d) => d === "express", name: "Express", category: "framework" },
  { matcher: (d) => d === "fastify", name: "Fastify", category: "framework" },
  { matcher: (d) => d === "koa", name: "Koa", category: "framework" },
  { matcher: (d) => d === "hono", name: "Hono", category: "framework" },
  { matcher: (d) => d.startsWith("@nestjs/"), name: "NestJS", category: "framework" },
  { matcher: (d) => d === "jest" || d === "@jest/core", name: "Jest", category: "tool" },
  { matcher: (d) => d === "vitest", name: "Vitest", category: "tool" },
  { matcher: (d) => d === "mocha", name: "Mocha", category: "tool" },
  { matcher: (d) => d === "playwright" || d === "@playwright/test", name: "Playwright", category: "tool" },
  { matcher: (d) => d === "cypress", name: "Cypress", category: "tool" },
  { matcher: (d) => d === "eslint", name: "ESLint", category: "tool" },
  { matcher: (d) => d === "prettier", name: "Prettier", category: "tool" },
  { matcher: (d) => d === "webpack", name: "Webpack", category: "tool" },
  { matcher: (d) => d === "vite", name: "Vite", category: "tool" },
  { matcher: (d) => d === "rollup", name: "Rollup", category: "tool" },
  { matcher: (d) => d === "esbuild", name: "esbuild", category: "tool" },
  { matcher: (d) => d === "tsx", name: "tsx", category: "tool" },
  { matcher: (d) => d === "ts-node", name: "ts-node", category: "tool" },
  { matcher: (d) => d === "tailwindcss", name: "Tailwind CSS", category: "library" },
];

// -------------------------------------------------------------------------- //
// JS / TS                                                                    //
// -------------------------------------------------------------------------- //

function detectJavaScript(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const pkg = findFile(input.files, "package.json");
  if (!pkg) return results;

  const [path, content] = pkg;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [tech("JavaScript", "language", "low", path, "package.json failed to parse")];
  }

  // JS is implied by package.json
  results.push(tech("JavaScript", "language", "high", path, "package.json present"));

  // Node runtime
  const engines = parsed.engines as Record<string, string> | undefined;
  if (engines?.node) {
    results.push(
      tech("Node.js", "runtime", "high", path, `engines.node = ${engines.node}`),
    );
  } else {
    results.push(tech("Node.js", "runtime", "medium", path, "implied by package.json"));
  }

  // Package manager
  const packageManager =
    typeof parsed.packageManager === "string" ? parsed.packageManager : undefined;
  if (packageManager) {
    const pm = packageManager.split("@")[0];
    results.push(tech(pm, "tool", "high", path, `packageManager = ${packageManager}`));
  } else if (input.files.has("pnpm-lock.yaml") || hasLockfile(input.files, "pnpm-lock.yaml")) {
    results.push(tech("pnpm", "tool", "high", "pnpm-lock.yaml"));
  } else if (hasLockfile(input.files, "yarn.lock")) {
    results.push(tech("Yarn", "tool", "high", "yarn.lock"));
  } else if (hasLockfile(input.files, "bun.lockb") || hasLockfile(input.files, "bun.lock")) {
    results.push(tech("Bun", "tool", "high", "bun.lock"));
  } else if (hasLockfile(input.files, "package-lock.json")) {
    results.push(tech("npm", "tool", "high", "package-lock.json"));
  }

  // Walk deps + devDeps for known frameworks/tools
  const deps = {
    ...(parsed.dependencies as Record<string, string> | undefined),
    ...(parsed.devDependencies as Record<string, string> | undefined),
    ...(parsed.peerDependencies as Record<string, string> | undefined),
  };
  const seen = new Set<string>();
  for (const dep of Object.keys(deps)) {
    for (const entry of JS_DEP_MAP) {
      if (entry.matcher(dep) && !seen.has(entry.name)) {
        seen.add(entry.name);
        results.push(
          tech(entry.name, entry.category, "high", path, `dependency: ${dep}`),
        );
      }
    }
  }

  return results;
}

function hasLockfile(files: Map<string, string>, name: string): boolean {
  return findFile(files, name) !== undefined;
}

function detectTypeScript(input: DetectorInput): DetectedTechnology[] {
  const ts = findFile(input.files, "tsconfig.json");
  if (ts) {
    return [
      tech("TypeScript", "language", "high", ts[0], "tsconfig.json present"),
    ];
  }
  return [];
}

// -------------------------------------------------------------------------- //
// Python                                                                     //
// -------------------------------------------------------------------------- //

const PY_LIB_MAP: Array<{ pattern: RegExp; name: string; category: DetectedTechnology["category"] }> = [
  { pattern: /^django\b/i, name: "Django", category: "framework" },
  { pattern: /^flask\b/i, name: "Flask", category: "framework" },
  { pattern: /^fastapi\b/i, name: "FastAPI", category: "framework" },
  { pattern: /^pytest\b/i, name: "pytest", category: "tool" },
  { pattern: /^ruff\b/i, name: "Ruff", category: "tool" },
  { pattern: /^black\b/i, name: "Black", category: "tool" },
  { pattern: /^mypy\b/i, name: "mypy", category: "tool" },
  { pattern: /^poetry\b/i, name: "Poetry", category: "tool" },
];

function detectPython(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const pyManifests = [
    "pyproject.toml",
    "requirements.txt",
    "Pipfile",
    "setup.py",
    "setup.cfg",
  ];
  const found = pyManifests
    .map((m) => findFile(input.files, m))
    .filter((f): f is [string, string] => f !== undefined);
  if (found.length === 0) return results;

  const sourcePath = found[0][0];
  results.push(
    tech("Python", "language", "high", sourcePath, `${found.length} python manifest(s)`),
  );

  // pip is the implicit installer for requirements.txt
  if (findFile(input.files, "requirements.txt")) {
    results.push(tech("pip", "tool", "high", "requirements.txt"));
  }
  if (findFile(input.files, "Pipfile")) {
    results.push(tech("Pipenv", "tool", "high", "Pipfile"));
  }

  // Aggregate the text of every manifest, scan for known libs.
  const blob = found.map(([, c]) => c).join("\n");

  // Poetry detection
  if (/^\s*\[tool\.poetry\]/m.test(blob)) {
    results.push(tech("Poetry", "tool", "high", sourcePath, "[tool.poetry] section"));
  }
  // Ruff & Black via pyproject.toml tool sections
  if (/^\s*\[tool\.ruff\]/m.test(blob)) {
    results.push(tech("Ruff", "tool", "high", sourcePath, "[tool.ruff] section"));
  }
  if (/^\s*\[tool\.black\]/m.test(blob)) {
    results.push(tech("Black", "tool", "high", sourcePath, "[tool.black] section"));
  }

  const seen = new Set<string>();
  for (const line of blob.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^["']?([\w.\-]+).*$/, "$1");
    for (const entry of PY_LIB_MAP) {
      if (entry.pattern.test(trimmed) && !seen.has(entry.name)) {
        seen.add(entry.name);
        results.push(
          tech(entry.name, entry.category, "high", sourcePath, `dependency: ${trimmed}`),
        );
      }
    }
  }

  return results;
}

// -------------------------------------------------------------------------- //
// JVM (Java / Kotlin / Scala)                                                //
// -------------------------------------------------------------------------- //

function detectJvm(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const pom = findFile(input.files, "pom.xml");
  const gradle = findFile(input.files, "build.gradle");
  const gradleKts = findFile(input.files, "build.gradle.kts");

  if (!pom && !gradle && !gradleKts) return results;

  const sourcePath = (pom ?? gradleKts ?? gradle)![0];
  const isKotlinBuild = !!gradleKts;
  // Language: Java is default for pom/gradle. Kotlin if .kts or kotlin plugin.
  const blob = [pom, gradle, gradleKts]
    .filter((f): f is [string, string] => f !== undefined)
    .map(([, c]) => c)
    .join("\n");

  if (isKotlinBuild || /kotlin\b/i.test(blob)) {
    results.push(
      tech("Kotlin", "language", "high", sourcePath, "Kotlin build script / plugin"),
    );
  }
  if (!isKotlinBuild || /\bjava\b/.test(blob)) {
    results.push(tech("Java", "language", isKotlinBuild ? "medium" : "high", sourcePath));
  }
  if (/scala\b/i.test(blob)) {
    results.push(tech("Scala", "language", "high", sourcePath, "scala plugin"));
  }

  // Build tool
  if (pom) results.push(tech("Maven", "tool", "high", "pom.xml"));
  if (gradle || gradleKts) {
    results.push(tech("Gradle", "tool", "high", (gradleKts ?? gradle)![0]));
  }

  // Common frameworks via simple regex
  const jvmLibs: Array<[RegExp, string, DetectedTechnology["category"]]> = [
    [/spring-boot|org\.springframework\.boot/i, "Spring Boot", "framework"],
    [/org\.springframework(?!\.boot)/i, "Spring", "framework"],
    [/io\.micronaut/i, "Micronaut", "framework"],
    [/io\.ktor/i, "Ktor", "framework"],
    [/io\.quarkus/i, "Quarkus", "framework"],
    [/junit-jupiter|org\.junit/i, "JUnit", "tool"],
    [/testng/i, "TestNG", "tool"],
    [/mockito/i, "Mockito", "tool"],
    [/testcontainers/i, "Testcontainers", "tool"],
  ];
  for (const [re, name, category] of jvmLibs) {
    if (re.test(blob)) {
      results.push(tech(name, category, "high", sourcePath, `mentioned in build file`));
    }
  }

  return results;
}

// -------------------------------------------------------------------------- //
// Go / Rust / Ruby / PHP                                                     //
// -------------------------------------------------------------------------- //

function detectGo(input: DetectorInput): DetectedTechnology[] {
  const gomod = findFile(input.files, "go.mod");
  if (!gomod) return [];
  const versionMatch = /^go\s+([\d.]+)/m.exec(gomod[1]);
  return [
    tech(
      "Go",
      "language",
      "high",
      gomod[0],
      versionMatch ? `go ${versionMatch[1]}` : "go.mod present",
    ),
  ];
}

function detectRust(input: DetectorInput): DetectedTechnology[] {
  const cargo = findFile(input.files, "Cargo.toml");
  if (!cargo) return [];
  return [tech("Rust", "language", "high", cargo[0], "Cargo.toml present")];
}

function detectRuby(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const gemfile = findFile(input.files, "Gemfile");
  if (!gemfile) return results;
  results.push(tech("Ruby", "language", "high", gemfile[0], "Gemfile present"));
  if (/['"]rails['"]/.test(gemfile[1])) {
    results.push(tech("Ruby on Rails", "framework", "high", gemfile[0], "rails gem"));
  }
  return results;
}

function detectPhp(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const composer = findFile(input.files, "composer.json");
  if (!composer) return results;
  results.push(tech("PHP", "language", "high", composer[0], "composer.json present"));
  if (/laravel\//i.test(composer[1])) {
    results.push(tech("Laravel", "framework", "high", composer[0]));
  }
  if (/symfony\//i.test(composer[1])) {
    results.push(tech("Symfony", "framework", "high", composer[0]));
  }
  return results;
}

// -------------------------------------------------------------------------- //
// Containers / CI                                                            //
// -------------------------------------------------------------------------- //

function detectContainers(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  if (findFile(input.files, "Dockerfile")) {
    results.push(tech("Docker", "tool", "high", "Dockerfile"));
  }
  if (
    findFile(input.files, "docker-compose.yml") ||
    findFile(input.files, "docker-compose.yaml")
  ) {
    results.push(tech("Docker Compose", "tool", "high", "docker-compose.yml"));
  }
  // Find k8s manifests by content sniff (apiVersion + kind in any yaml)
  for (const [path, content] of input.files) {
    if (!/\.ya?ml$/.test(path)) continue;
    if (/\napiVersion:\s*\S+/.test(content) && /\nkind:\s*\S+/.test(content)) {
      results.push(
        tech("Kubernetes", "tool", "medium", path, "apiVersion/kind in YAML"),
      );
      break;
    }
  }
  return results;
}

function detectCi(input: DetectorInput): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const ghaWorkflows: string[] = [];
  for (const path of input.files.keys()) {
    if (path.startsWith(".github/workflows/") && /\.ya?ml$/.test(path)) {
      ghaWorkflows.push(path);
    }
  }
  if (ghaWorkflows.length > 0) {
    results.push(
      tech(
        "GitHub Actions",
        "tool",
        "high",
        ghaWorkflows[0],
        `${ghaWorkflows.length} workflow file(s)`,
      ),
    );
  }
  if (findFile(input.files, ".gitlab-ci.yml")) {
    results.push(tech("GitLab CI", "tool", "high", ".gitlab-ci.yml"));
  }
  if (findFile(input.files, "Jenkinsfile")) {
    results.push(tech("Jenkins", "tool", "high", "Jenkinsfile"));
  }

  // Sniff GitHub Actions step `uses:` lines for popular actions (very light)
  for (const wf of ghaWorkflows) {
    const content = input.files.get(wf) ?? "";
    try {
      // Don't actually do anything with the parsed YAML — we only validate
      // structure to avoid scraping `uses:` from comments.
      parseYaml(content);
    } catch {
      // ignore malformed workflows
    }
  }

  return results;
}

// -------------------------------------------------------------------------- //
// GitHub /languages fallback                                                 //
// -------------------------------------------------------------------------- //

function detectFromLanguageBytes(input: DetectorInput): DetectedTechnology[] {
  const total = Object.values(input.githubLanguageBytes).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const results: DetectedTechnology[] = [];
  for (const [lang, bytes] of Object.entries(input.githubLanguageBytes)) {
    const pct = (bytes / total) * 100;
    if (pct < 1) continue; // skip noise
    results.push(
      tech(
        lang,
        "language",
        pct >= 10 ? "medium" : "low",
        "GitHub /languages API",
        `${pct.toFixed(1)}% of bytes`,
      ),
    );
  }
  return results;
}

// -------------------------------------------------------------------------- //
// Orchestrator                                                               //
// -------------------------------------------------------------------------- //

const DETECTORS: Detector[] = [
  detectJavaScript,
  detectTypeScript,
  detectPython,
  detectJvm,
  detectGo,
  detectRust,
  detectRuby,
  detectPhp,
  detectContainers,
  detectCi,
  detectFromLanguageBytes,
];

/**
 * Run every detector and merge duplicates. When the same canonical name is
 * detected from multiple sources we keep the highest-confidence entry and
 * concatenate the sources for transparency.
 */
export function runDetectors(
  files: RepoFile[],
  githubLanguageBytes: Record<string, number>,
): DetectedTechnology[] {
  const fileMap = new Map(files.map((f) => [f.path, f.content]));
  const input: DetectorInput = { files: fileMap, githubLanguageBytes };

  const raw = DETECTORS.flatMap((d) => d(input));

  // Deduplicate on canonical name.
  const byName = new Map<string, DetectedTechnology>();
  const rank = { high: 3, medium: 2, low: 1 } as const;
  for (const t of raw) {
    const existing = byName.get(t.name);
    if (!existing || rank[t.confidence] > rank[existing.confidence]) {
      byName.set(t.name, t);
    } else if (existing.source !== t.source) {
      existing.source = `${existing.source}, ${t.source}`;
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
