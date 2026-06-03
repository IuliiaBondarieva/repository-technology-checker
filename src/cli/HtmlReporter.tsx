import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "@/src/web/report/ReportView";
import type { AnalysisReport } from "@/src/core/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedGlobalsCss: string | null = null;

function getWebGlobalsCss(): string {
  if (cachedGlobalsCss !== null) return cachedGlobalsCss;
  try {
    cachedGlobalsCss = fs.readFileSync(
      path.resolve(__dirname, "../web/globals.css"),
      "utf-8",
    );
  } catch {
    cachedGlobalsCss = "";
  }
  return cachedGlobalsCss;
}

/** Standalone HTML file using the same React report as the web UI. */
export function renderHtmlReport(report: AnalysisReport): string {
  const html = renderToStaticMarkup(
    <ReportDocument report={report} css={getWebGlobalsCss()} />,
  );
  return `<!DOCTYPE html>${html}`;
}

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
