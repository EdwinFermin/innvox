import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFileMetadata, loadIgnoreRules, walkProjectFiles } from "./context-utils.mjs";

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "../..");
  const outputDir = path.join(repoRoot, ".cache/context");
  const outputPath = path.join(outputDir, "repo-map.json");

  const ignoreRules = await loadIgnoreRules(repoRoot);
  const files = await walkProjectFiles(repoRoot, ignoreRules);

  const fileEntries = [];
  for (const relativePath of files) {
    if (!relativePath.startsWith("src/") && !["package.json", "tsconfig.json", "next.config.ts", "README.md", "AGENTS.md"].includes(relativePath)) {
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

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(map, null, 2));

  console.log(`Wrote repo map: ${path.relative(repoRoot, outputPath)} (${fileEntries.length} files)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
