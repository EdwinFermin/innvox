import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFileMetadata, loadIgnoreRules, walkProjectFiles } from "./context-utils.mjs";

const INCLUDED_ROOT_FILES = new Set([
  ".contextignore",
  "AGENTS.md",
  "README.md",
  "docs/app-overview.md",
  "next.config.ts",
  "package.json",
  "tsconfig.json",
]);

function shouldIncludeInMap(relativePath) {
  return (
    relativePath.startsWith("src/") ||
    relativePath.startsWith("scripts/context/") ||
    relativePath.startsWith("supabase/migrations/") ||
    INCLUDED_ROOT_FILES.has(relativePath)
  );
}

function collectRouteGroups(files, prefix) {
  const groups = new Set();
  for (const file of files) {
    if (!file.path.startsWith(prefix)) {
      continue;
    }

    const rest = file.path.slice(prefix.length);
    const firstSegment = rest.split("/")[0];
    if (firstSegment) {
      groups.add(firstSegment);
    }
  }

  return [...groups].sort();
}

function buildSummary(fileEntries) {
  const byCategory = fileEntries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totalFiles: fileEntries.length,
    coreDocs: fileEntries
      .filter((entry) => ["README.md", "AGENTS.md", "docs/app-overview.md"].includes(entry.path))
      .map((entry) => entry.path),
    appRoutes: collectRouteGroups(fileEntries, "src/app/"),
    dashboardRoutes: collectRouteGroups(fileEntries, "src/app/dashboard/"),
    actionFiles: fileEntries.filter((entry) => entry.path.startsWith("src/actions/")).map((entry) => entry.path),
    hookFiles: fileEntries.filter((entry) => entry.path.startsWith("src/hooks/")).map((entry) => entry.path),
    authFiles: fileEntries.filter((entry) => entry.path.startsWith("src/lib/auth/")).map((entry) => entry.path),
    schemaFiles: fileEntries
      .filter((entry) => entry.path.startsWith("supabase/migrations/"))
      .map((entry) => entry.path),
    categoryCounts: byCategory,
  };
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "../..");
  const outputDir = path.join(repoRoot, ".cache/context");
  const mapPath = path.join(outputDir, "repo-map.json");
  const summaryPath = path.join(outputDir, "repo-summary.json");

  const ignoreRules = await loadIgnoreRules(repoRoot);
  const files = await walkProjectFiles(repoRoot, ignoreRules);

  const fileEntries = [];
  for (const relativePath of files) {
    if (!shouldIncludeInMap(relativePath)) {
      continue;
    }

    try {
      const metadata = await collectFileMetadata(repoRoot, relativePath);
      fileEntries.push(metadata);
    } catch {
      // Ignore unreadable files.
    }
  }

  const map = {
    generatedAt: new Date().toISOString(),
    totalFiles: fileEntries.length,
    files: fileEntries,
  };

  const summary = buildSummary(fileEntries);

  await mkdir(outputDir, { recursive: true });
  await writeFile(mapPath, JSON.stringify(map, null, 2));
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`Wrote repo map: ${path.relative(repoRoot, mapPath)} (${fileEntries.length} files)`);
  console.log(`Wrote repo summary: ${path.relative(repoRoot, summaryPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
