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
  ".sql",
]);

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "con",
  "de",
  "del",
  "dia",
  "do",
  "el",
  "en",
  "flow",
  "for",
  "from",
  "how",
  "la",
  "las",
  "los",
  "para",
  "por",
  "the",
  "una",
  "use",
  "with",
  "y",
]);

const TOKEN_SYNONYMS = {
  accounts: ["bank", "account"],
  ajuste: ["adjust", "balance"],
  auth: ["permission", "role", "guard", "session", "login"],
  bank: ["banco", "cuenta"],
  branch: ["branches", "sucursal", "sucursales"],
  branches: ["branch", "sucursal", "sucursales"],
  client: ["clients", "cliente", "clientes"],
  clients: ["client", "cliente", "clientes"],
  close: ["closing", "cuadre", "dailyclose"],
  cuadre: ["closing", "daily", "dailyclose"],
  daily: ["diario", "cuadre", "dailyclose"],
  expense: ["expenses", "gasto", "gastos"],
  expenses: ["expense", "gasto", "gastos"],
  factura: ["invoice", "invoices"],
  facturas: ["invoice", "invoices"],
  invoice: ["invoices", "factura", "facturas"],
  invoices: ["invoice", "factura", "facturas"],
  link: ["payment", "pago", "payment-link"],
  pago: ["payment", "link"],
  payment: ["pay", "link", "pago"],
  permissions: ["permission", "auth", "roles"],
  permission: ["permissions", "auth", "roles"],
  receivable: ["receivables", "cxc"],
  receivables: ["receivable", "cxc"],
  role: ["roles", "auth", "permission"],
  roles: ["role", "auth", "permission"],
  sucursal: ["branch", "branches"],
  sucursales: ["branch", "branches"],
  transfer: ["funds", "bank"],
};

const PHRASE_SYNONYMS = [
  {
    match: ["daily", "close"],
    expand: ["cuadre", "dailyclose", "daily-close", "cuadre-del-dia", "diario"],
  },
  {
    match: ["cuadre", "dia"],
    expand: ["daily", "dailyclose", "daily-close", "cuadre-del-dia", "diario"],
  },
  {
    match: ["link", "pago"],
    expand: ["payment", "payment-link", "link-payments", "link-de-pago"],
  },
  {
    match: ["auth", "branch"],
    expand: ["permission", "permissions", "role", "roles", "guard"],
  },
];

const WEAK_CONTENT_TOKENS = new Set(["close"]);

function escapeRegex(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values) {
  return Array.from(new Set(values));
}

function normalizeToken(token) {
  return normalizeText(token).replace(/[^a-z0-9]+/g, "").trim();
}

function expandToken(token) {
  const normalized = normalizeToken(token);
  if (!normalized || STOPWORDS.has(normalized)) {
    return [];
  }

  return unique([normalized, ...(TOKEN_SYNONYMS[normalized] ?? [])].map(normalizeToken).filter(Boolean));
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
    .map((pattern) => {
      const negated = pattern.startsWith("!");
      const normalized = pattern.replace(/^!/, "").replace(/^\.\//, "");
      return {
        pattern: normalized,
        negated,
        regex: globToRegExp(normalized),
      };
    });
}

export function isIgnored(relativePath, ignoreRules) {
  const normalized = relativePath.replaceAll("\\", "/");
  let ignored = false;

  for (const rule of ignoreRules) {
    if (!rule.regex.test(normalized)) {
      continue;
    }

    ignored = !rule.negated;
  }

  return ignored;
}

export function tokenizeQuery(query) {
  const normalizedQuery = normalizeText(query).replace(/[\/_-]+/g, " ");
  const queryWords = normalizedQuery.split(/[^a-z0-9]+/g).map(normalizeToken).filter(Boolean);
  const baseTokens = normalizedQuery
    .split(/[^a-z0-9]+/g)
    .map(normalizeToken)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

  const expanded = baseTokens.flatMap(expandToken);

  for (const phrase of PHRASE_SYNONYMS) {
    if (phrase.match.every((token) => queryWords.includes(token))) {
      expanded.push(...phrase.expand.flatMap(expandToken));
    }
  }

  return unique(expanded).sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function classifyFile(filePath) {
  if (filePath.startsWith("src/app/api/")) return "api-route";
  if (filePath.startsWith("src/actions/")) return "action";
  if (filePath.startsWith("src/app/dashboard/reports/")) return "report";
  if (filePath.startsWith("src/app/")) return "page-or-layout";
  if (filePath.startsWith("src/hooks/use-print")) return "print";
  if (filePath.startsWith("src/hooks/")) return "hook";
  if (filePath.startsWith("src/components/print/")) return "print";
  if (filePath.startsWith("src/components/")) return "component";
  if (filePath.startsWith("src/lib/auth/")) return "auth";
  if (filePath.startsWith("src/lib/supabase/")) return "supabase";
  if (filePath.startsWith("src/lib/")) return "lib";
  if (filePath.startsWith("src/utils/")) return "util";
  if (filePath.startsWith("src/types/")) return "type";
  if (filePath.startsWith("src/store/")) return "store";
  if (filePath.startsWith("scripts/context/")) return "script";
  if (filePath.startsWith("supabase/migrations/")) return "schema";
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

function extractKeywords(content) {
  const normalized = normalizeText(content)
    .replace(/[^a-z0-9\s/_-]+/g, " ")
    .replace(/[\/_-]+/g, " ");

  const counts = new Map();
  for (const token of normalized.split(/\s+/g)) {
    if (token.length < 3 || STOPWORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([token]) => token);
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
    keywords: extractKeywords(content),
  };
}

export function rankFile(entry, queryTokens) {
  const lowerPath = normalizeText(entry.path);
  const lowerSymbols = entry.symbols.map((symbol) => normalizeText(symbol));
  const lowerImports = (entry.imports ?? []).map((importPath) => normalizeText(importPath));
  const lowerKeywords = (entry.keywords ?? []).map((keyword) => normalizeText(keyword));
  let score = 0;
  const reason = [];

  for (const token of queryTokens) {
    if (lowerPath.includes(token)) {
      score += 9;
      reason.push(`path matches '${token}'`);
    }

    if (lowerPath.endsWith(`/${token}.ts`) || lowerPath.endsWith(`/${token}.tsx`) || lowerPath.endsWith(`/${token}.md`)) {
      score += 15;
      reason.push(`file name matches '${token}'`);
    }

    const symbolHit = lowerSymbols.find((symbol) => symbol.includes(token));
    if (symbolHit) {
      score += 7;
      reason.push(`symbol '${symbolHit}' matches '${token}'`);
    }

    if (lowerKeywords.includes(token)) {
      score += 4;
      reason.push(`keyword matches '${token}'`);
    }

    if (lowerImports.some((importPath) => importPath.includes(token))) {
      score += 2;
      reason.push(`import matches '${token}'`);
    }
  }

  if (entry.category === "report" && queryTokens.some((token) => ["report", "cuadre", "close"].includes(token))) {
    score += 5;
    reason.push("report category boost");
  }
  if (entry.category === "auth" && queryTokens.some((token) => ["auth", "permission", "role", "guard"].includes(token))) {
    score += 5;
    reason.push("auth category boost");
  }
  if (entry.category === "action") score += 2;
  if (entry.category === "hook") score += 2;
  if (entry.category === "schema") score += 3;
  if (entry.category === "lib" || entry.category === "util" || entry.category === "supabase") score += 1;

  return { score, reason: unique(reason) };
}

function resolveWithCandidates(targetBase, knownFiles) {
  const candidates = [
    targetBase,
    `${targetBase}.ts`,
    `${targetBase}.tsx`,
    `${targetBase}.js`,
    `${targetBase}.jsx`,
    `${targetBase}.mjs`,
    `${targetBase}.cjs`,
    `${targetBase}.json`,
    `${targetBase}/index.ts`,
    `${targetBase}/index.tsx`,
    `${targetBase}/index.js`,
    `${targetBase}/index.mjs`,
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveImport(fromPath, importPath, knownFiles, aliasRules = []) {
  if (importPath.startsWith(".")) {
    const fromDir = path.posix.dirname(fromPath);
    const targetBase = path.posix.normalize(path.posix.join(fromDir, importPath));
    return resolveWithCandidates(targetBase, knownFiles);
  }

  for (const rule of aliasRules) {
    if (!importPath.startsWith(rule.prefix)) {
      continue;
    }

    const suffix = importPath.slice(rule.prefix.length);
    const targetBase = path.posix.normalize(path.posix.join(rule.target, suffix));
    const resolved = resolveWithCandidates(targetBase, knownFiles);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function scoreContent(content, queryTokens) {
  const normalized = normalizeText(content);
  const lines = normalized.split(/\r?\n/g);
  let score = 0;
  const reason = [];

  for (const token of queryTokens) {
    const countRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`, "g");
    const lineRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`);
    const matches = normalized.match(countRegex)?.length ?? 0;
    if (matches === 0 || (WEAK_CONTENT_TOKENS.has(token) && matches < 2)) {
      continue;
    }

    score += Math.min(matches, 4) * 5;
    reason.push(`content matches '${token}'`);

    const earlyHit = lines.slice(0, 80).some((line) => lineRegex.test(line));
    if (earlyHit) {
      score += 1;
    }
  }

  return { score, reason: unique(reason) };
}

export function mergeLineNumbers(lineNumbers, maxLines = 80) {
  const merged = [];
  let previous = null;

  for (const lineNumber of lineNumbers) {
    if (previous === lineNumber) {
      continue;
    }

    merged.push(lineNumber);
    previous = lineNumber;

    if (merged.length >= maxLines) {
      break;
    }
  }

  return merged;
}

export function formatNumberedSnippet(content, lineNumbers) {
  const lines = content.split(/\r?\n/g);
  return lineNumbers.map((lineNumber) => `${lineNumber}: ${lines[lineNumber - 1] ?? ""}`).join("\n");
}
