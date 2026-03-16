import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CASES = [
  {
    name: "daily-close",
    query: "daily close report",
    scope: ["src/app/dashboard", "src/hooks", "src/actions", "src/types", "src/lib"],
    expected: [
      "src/app/dashboard/reports/cuadre-del-dia/page.tsx",
      "src/hooks/use-daily-close-report.ts",
      "src/hooks/use-print-daily-close.tsx",
    ],
  },
  {
    name: "auth-branches",
    query: "auth branch permissions",
    scope: ["src/app", "src/lib", "src/store", "src/actions"],
    expected: [
      "src/lib/auth/guards.ts",
      "src/lib/auth/permissions.ts",
      "src/lib/auth/roles.ts",
      "src/actions/branches.ts",
    ],
  },
  {
    name: "link-payments",
    query: "link de pago QR flow",
    scope: ["src/app/dashboard", "src/hooks", "src/actions", "src/types", "src/lib"],
    expected: [
      "src/app/dashboard/link-de-pago/page.tsx",
      "src/actions/link-payments.ts",
      "src/hooks/use-link-payments.ts",
    ],
  },
];

function runNodeScript(repoRoot, scriptPath, args) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function summarizeCase(result) {
  const status = result.ok ? "PASS" : "FAIL";
  const topSelected = result.selected.slice(0, 6).map((item) => item.path).join(", ");
  const missing = result.missing.length > 0 ? result.missing.join(", ") : "(none)";
  return `- ${status} ${result.name}: ${result.query}\n  - expected missing: ${missing}\n  - top selected: ${topSelected}`;
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "../..");
  const cacheDir = path.join(repoRoot, ".cache/context");
  const reportJsonPath = path.join(cacheDir, "doctor-report.json");
  const reportMdPath = path.join(cacheDir, "doctor-report.md");
  const repoMapScript = path.join(repoRoot, "scripts/context/repo-map.mjs");
  const packScript = path.join(repoRoot, "scripts/context/build-context.mjs");

  runNodeScript(repoRoot, repoMapScript, []);

  const results = [];

  for (const testCase of CASES) {
    runNodeScript(repoRoot, packScript, [
      "--query",
      testCase.query,
      "--scope",
      testCase.scope.join(","),
      "--budget",
      "12000",
      "--max-files",
      "10",
    ]);

    const pack = await loadJson(path.join(cacheDir, "last-pack.json"));
    const selectedPaths = pack.selected.map((entry) => entry.path);
    const missing = testCase.expected.filter((expectedPath) => !selectedPaths.includes(expectedPath));
    results.push({
      name: testCase.name,
      query: testCase.query,
      scope: testCase.scope,
      expected: testCase.expected,
      selected: pack.selected,
      embedded: pack.embedded,
      missing,
      ok: missing.length === 0,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    ok: results.every((result) => result.ok),
    cases: results,
  };

  const markdown = [
    "# Context Doctor",
    "",
    `- Overall: ${payload.ok ? "PASS" : "FAIL"}`,
    `- Generated: ${payload.generatedAt}`,
    "",
    "## Cases",
    ...results.map(summarizeCase),
  ].join("\n");

  await mkdir(cacheDir, { recursive: true });
  await writeFile(reportJsonPath, JSON.stringify(payload, null, 2));
  await writeFile(reportMdPath, `${markdown}\n`);

  console.log(markdown);
  console.log(`\nSaved: ${path.relative(repoRoot, reportMdPath)}`);
  console.log(`Saved: ${path.relative(repoRoot, reportJsonPath)}`);

  if (!payload.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
