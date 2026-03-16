import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatNumberedSnippet,
  loadIgnoreRules,
  mergeLineNumbers,
  normalizeText,
  rankFile,
  resolveImport,
  scoreContent,
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

function detectQueryIntents(queryTokens) {
  const tokenSet = new Set(queryTokens);
  return {
    auth:
      tokenSet.has("auth") ||
      tokenSet.has("permission") ||
      tokenSet.has("permissions") ||
      tokenSet.has("role") ||
      tokenSet.has("roles") ||
      tokenSet.has("guard"),
    branch: tokenSet.has("branch") || tokenSet.has("branches") || tokenSet.has("sucursal"),
    report:
      tokenSet.has("report") ||
      tokenSet.has("cuadre") ||
      tokenSet.has("daily") ||
      tokenSet.has("dailyclose") ||
      tokenSet.has("closing"),
    linkPayment:
      tokenSet.has("link") ||
      tokenSet.has("payment") ||
      tokenSet.has("pago") ||
      tokenSet.has("linkdepago") ||
      tokenSet.has("linkpayments"),
  };
}

function applyIntentAdjustments(entry, intents) {
  let score = entry.score;
  const adjustedReasons = [];
  const lowerPath = entry.path.toLowerCase();

  if (intents.auth) {
    if (entry.category === "auth") {
      score += 24;
      adjustedReasons.push("auth intent boost");
    }
    if (lowerPath.includes("permissions.ts")) {
      score += 18;
      adjustedReasons.push("permissions file boost");
    }
    if (lowerPath.includes("branches")) {
      score += 8;
      adjustedReasons.push("branch auth boost");
    }
    if (entry.category === "page-or-layout" && !lowerPath.includes("branch") && !lowerPath.includes("login")) {
      score -= 12;
      adjustedReasons.push("generic page auth penalty");
    }
  }

  if (intents.report) {
    const isDailyClosePath =
      lowerPath.includes("cuadre-del-dia") ||
      lowerPath.includes("daily-close") ||
      lowerPath.includes("use-daily-close") ||
      lowerPath.includes("daily-close-report");

    if (isDailyClosePath) {
      score += 24;
      adjustedReasons.push("daily close intent boost");
    }

    if (entry.category === "report" && !isDailyClosePath && !lowerPath.includes("profit")) {
      score -= 10;
      adjustedReasons.push("other report penalty");
    }
  }

  if (intents.linkPayment) {
    if (lowerPath.includes("link-payments") || lowerPath.includes("link-de-pago")) {
      score += 18;
      adjustedReasons.push("link payment intent boost");
    }
    if (entry.category === "action" && lowerPath.includes("link-payments")) {
      score += 8;
      adjustedReasons.push("link payment action boost");
    }
  }

  return {
    ...entry,
    score,
    reason: [...(entry.reason ?? []), ...adjustedReasons],
  };
}

function prependCoreFiles(selected, repoMap, maxFiles) {
  const corePaths = ["docs/app-overview.md", "AGENTS.md"];
  const byPath = new Map(repoMap.files.map((entry) => [entry.path, entry]));
  const selectedSet = new Set(selected.map((entry) => entry.path));
  const prepended = [];

  for (const corePath of corePaths) {
    if (selectedSet.has(corePath)) continue;

    const entry = byPath.get(corePath);
    if (!entry) continue;

    prepended.push({
      ...entry,
      score: Number.MAX_SAFE_INTEGER,
      lexicalReason: [corePath === "AGENTS.md" ? "core context workflow" : "core app overview"],
      contentReason: [],
      finalReason: corePath === "AGENTS.md" ? "core context workflow" : "core app overview",
    });
  }

  return [...prepended, ...selected].slice(0, maxFiles);
}

function createWordRegex(token) {
  return new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
}

function collectImportLines(lines) {
  const importLines = [];
  for (let index = 0; index < Math.min(lines.length, 80); index += 1) {
    if (/^import\s/.test(lines[index])) {
      importLines.push(index + 1);
    }
  }
  return importLines;
}

function collectExportLines(lines) {
  const exportLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/export\s+(default\s+)?(async\s+)?(function|const|type|interface|class|enum)/.test(lines[index])) {
      exportLines.push(index + 1);
    }
  }
  return exportLines;
}

function lineRangesForTokens(content, queryTokens, filePath, padding = 3) {
  const lines = content.split(/\r?\n/g);
  const normalizedLines = lines.map((line) => normalizeText(line));
  const hits = new Set();
  const tokenRegexes = queryTokens.map((token) => [token, createWordRegex(token)]);

  for (let index = 0; index < normalizedLines.length; index += 1) {
    const line = normalizedLines[index];
    const matched = tokenRegexes.some(([, regex]) => regex.test(line));
    if (!matched) {
      continue;
    }

    const start = Math.max(1, index + 1 - padding);
    const end = Math.min(lines.length, index + 1 + padding);
    for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
      hits.add(lineNumber);
    }
  }

  const importLines = collectImportLines(lines);
  const exportLines = collectExportLines(lines);
  const preferred = new Set();

  if (!filePath.endsWith(".md") && hits.size > 0) {
    for (const lineNumber of importLines.slice(0, 16)) {
      preferred.add(lineNumber);
    }
  }

  for (const lineNumber of exportLines.slice(0, 16)) {
    preferred.add(lineNumber);
  }

  for (const lineNumber of hits) {
    preferred.add(lineNumber);
  }

  if (preferred.size === 0) {
    const fallback = filePath.endsWith(".md") ? 60 : 40;
    for (let lineNumber = 1; lineNumber <= Math.min(lines.length, fallback); lineNumber += 1) {
      preferred.add(lineNumber);
    }
  }

  return mergeLineNumbers([...preferred].sort((a, b) => a - b), 80);
}

async function loadJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadRepoMap(repoRoot) {
  return loadJson(path.join(repoRoot, ".cache/context/repo-map.json"));
}

async function loadAliasRules(repoRoot) {
  const tsconfig = await loadJson(path.join(repoRoot, "tsconfig.json"));
  const paths = tsconfig.compilerOptions?.paths ?? {};
  const rules = [];

  for (const [aliasPattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0) {
      continue;
    }

    const aliasPrefix = aliasPattern.replace(/\*$/, "");
    const targetPrefix = String(targets[0]).replace(/^\.\//, "").replace(/\*$/, "");
    rules.push({
      prefix: aliasPrefix,
      target: targetPrefix.replaceAll("\\", "/"),
    });
  }

  return rules;
}

async function rerankWithContent(repoRoot, ranked, queryTokens) {
  const candidates = ranked.slice(0, 30);

  return Promise.all(
    candidates.map(async (entry) => {
      try {
        const absolutePath = path.join(repoRoot, entry.path);
        const content = await readFile(absolutePath, "utf8");
        const contentRanking = scoreContent(content, queryTokens);
        return {
          ...entry,
          contentScore: contentRanking.score,
          contentReason: contentRanking.reason,
          score: entry.score + contentRanking.score,
          finalReason: contentRanking.reason[0] ?? entry.reason[0] ?? "relevant by ranking",
        };
      } catch {
        return {
          ...entry,
          contentScore: 0,
          contentReason: [],
          finalReason: entry.reason[0] ?? "relevant by ranking",
        };
      }
    }),
  );
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
  const aliasRules = await loadAliasRules(repoRoot);
  const queryTokens = tokenizeQuery(args.query);
  const queryIntents = detectQueryIntents(queryTokens);
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
    .map((entry) => applyIntentAdjustments(entry, queryIntents))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const reranked = (await rerankWithContent(repoRoot, ranked, queryTokens)).sort(
    (a, b) => b.score - a.score || a.path.localeCompare(b.path),
  );

  const selected = [];
  const selectedSet = new Set();
  const sourceList = reranked.length > 0 ? reranked : [];
  const minSelectionScore = reranked.length > 0 ? Math.max(4, Math.floor(reranked[0].score * 0.1)) : 0;

  for (const entry of sourceList) {
    if (selected.length >= args.maxFiles) break;
    if (selectedSet.has(entry.path)) continue;
    if (entry.score < minSelectionScore) continue;
    if (ignoreRules.length > 0 && ignoreRules.some((rule) => !rule.negated && rule.regex.test(entry.path))) {
      continue;
    }

    selected.push({
      ...entry,
      lexicalReason: entry.reason,
      finalReason: entry.finalReason ?? entry.reason[0] ?? "relevant by ranking",
    });
    selectedSet.add(entry.path);
  }

  for (const entry of [...selected]) {
    if (selected.length >= args.maxFiles) break;

    for (const importPath of entry.imports ?? []) {
      if (selected.length >= args.maxFiles) break;
      const resolved = resolveImport(entry.path, importPath, knownFiles, aliasRules);
      if (!resolved || selectedSet.has(resolved)) continue;

      const importedEntry = repoMap.files.find((file) => file.path === resolved);
      if (!importedEntry) continue;

      selected.push({
        ...importedEntry,
        score: 0,
        lexicalReason: [`dependency of ${entry.path}`],
        contentReason: [],
        finalReason: `dependency of ${entry.path}`,
      });
      selectedSet.add(resolved);
    }
  }

  const withCoreContext = prependCoreFiles(selected, repoMap, args.maxFiles);

  await mkdir(cacheDir, { recursive: true });

  const headerLines = [
    `# Context Pack`,
    "",
    `- Query: ${args.query}`,
    `- Query tokens: ${queryTokens.join(", ") || "(none)"}`,
    `- Budget (chars): ${args.budget}`,
    `- Max files: ${args.maxFiles}`,
    `- Scope: ${args.scope.length > 0 ? args.scope.join(", ") : "(none)"}`,
    "",
    "## Selected Files",
  ];

  for (const file of withCoreContext) {
    headerLines.push(`- ${file.path} -- ${file.finalReason}`);
  }

  let markdown = `${headerLines.join("\n")}\n`;
  const embedded = [];

  for (const file of withCoreContext) {
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

    const lineNumbers = lineRangesForTokens(content, queryTokens, file.path);
    const snippet = formatNumberedSnippet(content, lineNumbers);
    const available = Math.max(0, args.budget - markdown.length);
    const trimmedSnippet = snippet.slice(0, Math.max(0, available - 256));

    if (!trimmedSnippet) {
      break;
    }

    const ext = path.extname(file.path).slice(1) || "txt";
    const section = [
      "",
      `## ${file.path}`,
      `Reason: ${file.finalReason.replace(/\.$/, "")}.`,
      "```" + ext,
      trimmedSnippet,
      "```",
    ].join("\n");

    if (markdown.length + section.length > args.budget) {
      continue;
    }

    markdown += section;
    embedded.push({
      path: file.path,
      reason: file.finalReason,
      score: file.score,
      lexicalReason: file.lexicalReason ?? [],
      contentReason: file.contentReason ?? [],
      lines: lineNumbers.length,
    });
  }

  if (embedded.length > 0) {
    markdown += "\n\n## Embedded Files\n";
    markdown += embedded.map((file) => `- ${file.path} -- ${file.reason}`).join("\n");
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    query: args.query,
    queryTokens,
    budget: args.budget,
    maxFiles: args.maxFiles,
    scope: args.scope,
    selected: withCoreContext.map((file) => ({
      path: file.path,
      reason: file.finalReason,
      score: file.score,
      lexicalReason: file.lexicalReason ?? [],
      contentReason: file.contentReason ?? [],
    })),
    embedded,
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
