import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatNumberedSnippet,
  loadIgnoreRules,
  rankFile,
  resolveRelativeImport,
  tokenizeQuery,
} from "./context-utils.mjs";

function parseArgs(argv) {
  const args = {
    query: "",
    budget: 12000,
    maxFiles: 10,
    scope: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--query" && next) {
      args.query = next;
      i += 1;
      continue;
    }

    if (current === "--budget" && next) {
      args.budget = Number(next) || args.budget;
      i += 1;
      continue;
    }

    if (current === "--max-files" && next) {
      args.maxFiles = Number(next) || args.maxFiles;
      i += 1;
      continue;
    }

    if (current === "--scope" && next) {
      args.scope = next
        .split(",")
        .map((value) => value.trim().replaceAll("\\", "/"))
        .filter(Boolean);
      i += 1;
    }
  }

  return args;
}

function chooseScopedFiles(files, scope) {
  if (scope.length === 0) {
    return files;
  }

  return files.filter((entry) => scope.some((prefix) => entry.path.startsWith(prefix)));
}

function lineRangesForTokens(content, queryTokens, padding = 4) {
  const lines = content.split(/\r?\n/g);
  const hits = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const lowerLine = lines[i].toLowerCase();
    if (queryTokens.some((token) => lowerLine.includes(token))) {
      const start = Math.max(1, i + 1 - padding);
      const end = Math.min(lines.length, i + 1 + padding);
      for (let line = start; line <= end; line += 1) {
        hits.add(line);
      }
    }
  }

  if (hits.size === 0) {
    const defaultSize = Math.min(lines.length, 80);
    for (let line = 1; line <= defaultSize; line += 1) {
      hits.add(line);
    }
  }

  return Array.from(hits).sort((a, b) => a - b);
}

async function loadRepoMap(repoRoot) {
  const mapPath = path.join(repoRoot, ".cache/context/repo-map.json");
  const raw = await readFile(mapPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    throw new Error("Missing required --query value");
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "../..");
  const cacheDir = path.join(repoRoot, ".cache/context");
  const packMdPath = path.join(cacheDir, "last-pack.md");
  const packJsonPath = path.join(cacheDir, "last-pack.json");

  const ignoreRules = await loadIgnoreRules(repoRoot);
  const repoMap = await loadRepoMap(repoRoot);
  const queryTokens = tokenizeQuery(args.query);
  const knownFiles = new Set(repoMap.files.map((entry) => entry.path));

  const scopedEntries = chooseScopedFiles(repoMap.files, args.scope).filter(
    (entry) => !entry.path.startsWith(".cache/"),
  );

  const ranked = scopedEntries
    .map((entry) => {
      const ranking = rankFile(entry, queryTokens);
      return {
        ...entry,
        score: ranking.score,
        reason: ranking.reason,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const selected = [];
  const selectedSet = new Set();

  for (const entry of ranked) {
    if (selected.length >= args.maxFiles) break;
    if (selectedSet.has(entry.path)) continue;
    if (ignoreRules.length > 0 && ignoreRules.some(({ regex }) => regex.test(entry.path))) continue;

    selected.push(entry);
    selectedSet.add(entry.path);
  }

  for (const entry of [...selected]) {
    if (selected.length >= args.maxFiles) break;

    for (const importPath of entry.imports ?? []) {
      if (selected.length >= args.maxFiles) break;
      const resolved = resolveRelativeImport(entry.path, importPath, knownFiles);
      if (!resolved || selectedSet.has(resolved)) continue;

      const importedEntry = repoMap.files.find((file) => file.path === resolved);
      if (!importedEntry) continue;

      selected.push({
        ...importedEntry,
        score: 0,
        reason: [`dependency of ${entry.path}`],
      });
      selectedSet.add(resolved);
    }
  }

  await mkdir(cacheDir, { recursive: true });

  const headerLines = [
    `# Context Pack`,
    "",
    `- Query: ${args.query}`,
    `- Budget (chars): ${args.budget}`,
    `- Max files: ${args.maxFiles}`,
    `- Scope: ${args.scope.length > 0 ? args.scope.join(", ") : "(none)"}`,
    "",
    "## Included Files",
  ];

  for (const file of selected) {
    const reason = file.reason.length > 0 ? file.reason[0] : "relevant by ranking";
    headerLines.push(`- ${file.path} -- ${reason}`);
  }

  let markdown = `${headerLines.join("\n")}\n`;
  const included = [];

  for (const file of selected) {
    if (markdown.length >= args.budget) {
      break;
    }

    const absolutePath = path.join(repoRoot, file.path);
    let content;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    const lineNumbers = lineRangesForTokens(content, queryTokens);
    const snippet = formatNumberedSnippet(content, lineNumbers);
    const available = Math.max(0, args.budget - markdown.length);
    const trimmedSnippet = snippet.slice(0, Math.max(0, available - 128));

    if (!trimmedSnippet) {
      break;
    }

    const ext = path.extname(file.path).slice(1) || "txt";
    const section = [
      "",
      `## ${file.path}`,
      `Reason: ${(file.reason[0] ?? "relevant by ranking").replace(/\.$/, "")}.`,
      "```" + ext,
      trimmedSnippet,
      "```",
    ].join("\n");

    if (markdown.length + section.length > args.budget) {
      break;
    }

    markdown += section;
    included.push({
      path: file.path,
      reason: file.reason[0] ?? "relevant by ranking",
      score: file.score,
      lines: lineNumbers.length,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    query: args.query,
    budget: args.budget,
    maxFiles: args.maxFiles,
    scope: args.scope,
    included,
  };

  await writeFile(packMdPath, markdown);
  await writeFile(packJsonPath, JSON.stringify(payload, null, 2));

  console.log(markdown);
  console.error(`\nSaved: ${path.relative(repoRoot, packMdPath)}`);
  console.error(`Saved: ${path.relative(repoRoot, packJsonPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
