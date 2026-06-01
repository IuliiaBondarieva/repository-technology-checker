import { Octokit } from "octokit";
import type { RepoFile } from "../types";

// Files we fetch from the repo tree. The detectors only care about a small,
// well-known set of manifest/config files; anything else is noise.
const INDICATOR_FILES = new Set<string>([
  // JavaScript / TypeScript
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "tsconfig.json",
  // Python
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "setup.cfg",
  "Pipfile",
  "ruff.toml",
  // JVM
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  // Go / Rust / Ruby / PHP
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  // Containers / CI
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".gitlab-ci.yml",
  "Jenkinsfile",
]);

const FILE_FETCH_LIMIT = 40;

export class GitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // flat list of every file/folder in the repo
  async getRepoFiles(owner: string, repo: string): Promise<RepoFile[]> {
    const { data: tree } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    const candidates: string[] = [];
    for (const item of tree.tree) {
      if (item.type !== "blob" || !item.path) continue;
      const base = item.path.split("/").pop() ?? "";
      const isIndicator = INDICATOR_FILES.has(base);
      const isWorkflow =
        item.path.startsWith(".github/workflows/") &&
        /\.ya?ml$/.test(item.path);
      const isK8s =
        /\.ya?ml$/.test(item.path) &&
        (item.path.includes("k8s") || item.path.includes("kubernetes"));
      if (isIndicator || isWorkflow || isK8s) candidates.push(item.path);
    }

    const toFetch = candidates.slice(0, FILE_FETCH_LIMIT);
    const files: RepoFile[] = [];
    for (const path of toFetch) {
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        });
        if (!Array.isArray(data) && data.type === "file" && "content" in data) {
          files.push({
            path,
            content: Buffer.from(data.content, "base64").toString("utf-8"),
          });
        }
      } catch {
        // File missing on default branch — ignore.
      }
    }
    return files;
  }

  /**
   * GitHub's Linguist-powered byte counts per language. Free, deterministic,
   * and far more accurate than guessing from file extensions ourselves.
   */
  async getLanguageBytes(
    owner: string,
    repo: string,
  ): Promise<Record<string, number>> {
    try {
      const { data } = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });
      return data as Record<string, number>;
    } catch {
      return {};
    }
  }
}
