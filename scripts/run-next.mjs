import { spawn } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <next-args>");
  process.exit(1);
}

const warningMarker = "[baseline-browser-mapping]";

function createForwarder(target) {
  let buffer = "";

  return (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.includes(warningMarker)) {
        target.write(`${line}\n`);
      }
    }
  };
}

const child = spawn("next", args, {
  shell: process.platform === "win32",
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

const forwardStdout = createForwarder(process.stdout);
const forwardStderr = createForwarder(process.stderr);

child.stdout.on("data", forwardStdout);
child.stderr.on("data", forwardStderr);

child.on("close", (code) => {
  process.exit(code ?? 1);
});
