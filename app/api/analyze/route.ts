import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@/src/core/github";
import { analyze } from "@/src/core/analyzer";
import { ConfigSchema } from "@/src/core/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const config = ConfigSchema.parse(await request.json());
    const [owner, repo] = config.repository.split("/");

    const github = new GitHubClient(process.env.GITHUB_TOKEN);
    const [files, languageBytes] = await Promise.all([
      github.getRepoFiles(owner, repo),
      github.getLanguageBytes(owner, repo),
    ]);

    const report = await analyze({
      repository: config.repository,
      files,
      githubLanguageBytes: languageBytes,
      allowedTechnologies: config.allowedTechnologies,
      useAI: config.useAI ?? false,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
