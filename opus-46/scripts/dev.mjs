#!/usr/bin/env bun
import { spawnSync, spawn } from "child_process";

// Get a random available port via Python
const result = spawnSync("python3", ["./scripts/get_port.py"], {
  encoding: "utf-8",
});

if (result.status !== 0) {
  console.error("Failed to get random port:", result.stderr);
  process.exit(1);
}

const port = result.stdout.trim();
console.log(`Starting dev server on port ${port}...`);

const child = spawn(
  "bunx",
  ["vite", "--host", "0.0.0.0", "--port", port, "--strictPort"],
  { stdio: "inherit" }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
