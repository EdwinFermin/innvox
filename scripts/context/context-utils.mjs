import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
]);

function escapeRegex(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function globToRegExp(pattern) {
  const normalized = pattern.replaceAll("\\", "/").trim();
  let regex = "^";

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === "*" && next === "*") {
      regex += ".*";
      i += 1;
      continue;
    }

    if (char === "*") {
      regex += "[^/]*";
      continue;
    }

    regex += escapeRegex(char);
  }

  regex += "$";
  return new RegExp(regex);
}

export async function loadIgnoreRules(repoRoot) {
  const ignorePath = path.join(repoRoot, ".contextignore");
  let raw = "";

  try {
    raw = await readFile(ignorePath, "utf8");
  } catch {
    return [];
  }

  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => ({
      pattern,
      regex: globToRegExp(pattern.replace(/^\.\//, "")),
    }));
}

export function isIgnored(relativePath, ignoreRules) {
  const normalized = relativePath.replaceAll("\\", "/");
  return ignoreRules.some(({ regex }) => regex.test(normalized));
}

export function tokenizeQuery(query) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9_/-]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length > 2),
    ),
  );
}

export function classifyFile(filePath) {
  if (filePath.startsWith("src/app/api/")) return "api-route";
  if (filePath.startsWith("src/app/")) return "page-or-layout";
  if (filePath.startsWith("src/hooks/")) return "hook";
  if (filePath.startsWith("src/components/")) return "component";
  if (filePath.startsWith("src/lib/")) return "lib";
  if (filePath.startsWith("src/utils/")) return "util";
  if (filePath.startsWith("src/types/")) return "type";
  if (filePath.startsWith("src/store/")) return "store";
  return "other";
}

export async function walkProjectFiles(repoRoot, ignoreRules) {
  const output = [];
  const queue = [repoRoot];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(repoRoot, absolutePath).replaceAll("\\", "/");

      if (!relativePath) {
        continue;
      }

      if (isIgnored(relativePath, ignoreRules)) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (DEFAULT_EXTENSIONS.has(ext)) {
          output.push(relativePath);
        }
      }
    }
  }

  output.sort();
  return output;
}

export async function collectFileMetadata(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileStat = await stat(absolutePath);
  const content = await readFile(absolutePath, "utf8");

  const symbols = [];
  const symbolRegex =
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|type|interface|class|enum)\s+([A-Za-z0-9_]+)/g;
  let symbolMatch = symbolRegex.exec(content);
  while (symbolMatch) {
    symbols.push(symbolMatch[1]);
    symbolMatch = symbolRegex.exec(content);
  }

  const imports = [];
  const importRegex = /from\s+["']([^"']+)["']/g;
  let importMatch = importRegex.exec(content);
  while (importMatch) {
    imports.push(importMatch[1]);
    importMatch = importRegex.exec(content);
  }

  return {
    path: relativePath,
    category: classifyFile(relativePath),
    bytes: fileStat.size,
    symbols,
    imports,
  };
}

export function rankFile(entry, queryTokens) {
  const lowerPath = entry.path.toLowerCase();
  const lowerSymbols = entry.symbols.map((symbol) => symbol.toLowerCase());
  let score = 0;
  const reason = [];

  for (const token of queryTokens) {
    if (lowerPath.includes(token)) {
      score += 8;
      reason.push(`path matches '${token}'`);
    }

    const symbolHit = lowerSymbols.find((symbol) => symbol.includes(token));
    if (symbolHit) {
      score += 6;
      reason.push(`symbol '${symbolHit}' matches '${token}'`);
    }
  }

  if (entry.category === "api-route") score += 3;
  if (entry.category === "hook") score += 2;
  if (entry.category === "lib" || entry.category === "util") score += 1;

  if (score === 0) {
    if (entry.path.startsWith("src/")) {
      score = 1;
      reason.push("fallback source coverage");
    }
  }

  return { score, reason };
}

export function resolveRelativeImport(fromPath, importPath, knownFiles) {
  if (!importPath.startsWith(".")) {
    return null;
  }

  const fromDir = path.posix.dirname(fromPath);
  const targetBase = path.posix.normalize(path.posix.join(fromDir, importPath));
  const candidates = [
    targetBase,
    `${targetBase}.ts`,
    `${targetBase}.tsx`,
    `${targetBase}.js`,
    `${targetBase}.jsx`,
    `${targetBase}.mjs`,
    `${targetBase}.cjs`,
    `${targetBase}/index.ts`,
    `${targetBase}/index.tsx`,
    `${targetBase}/index.js`,
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function formatNumberedSnippet(content, lineNumbers) {
  const lines = content.split(/\r?\n/g);
  return lineNumbers
    .map((lineNumber) => `${lineNumber}: ${lines[lineNumber - 1] ?? ""}`)
    .join("\n");
}
