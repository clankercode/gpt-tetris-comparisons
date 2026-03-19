import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portScript = resolve(scriptDir, "random-port.py");

const portProc = spawn("python3", [portScript], {
  stdio: ["ignore", "pipe", "inherit"],
});

let port = "";
for await (const chunk of portProc.stdout) {
  port += chunk.toString();
}

const exitCode = await new Promise((resolveExit) => {
  portProc.on("exit", (code) => resolveExit(code ?? 0));
});

if (exitCode !== 0) {
  process.exit(exitCode);
}

const chosenPort = port.trim();
if (!/^\d+$/.test(chosenPort)) {
  throw new Error(`Random port helper returned an invalid port: ${chosenPort}`);
}

console.log(`Starting Vite dev server on port ${chosenPort}`);

const vite = spawn("bunx", ["vite", "--host", "127.0.0.1", "--port", chosenPort], {
  stdio: "inherit",
  env: process.env,
});

vite.on("exit", (code) => {
  process.exit(code ?? 0);
});
