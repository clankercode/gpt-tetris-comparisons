import { spawnSync, spawn } from "node:child_process";

const portResult = spawnSync("python3", ["./scripts/get_port.py"], {
  stdio: ["ignore", "pipe", "inherit"],
  encoding: "utf8",
});

if (portResult.status !== 0) {
  process.exit(portResult.status ?? 1);
}

const port = portResult.stdout.trim();

if (!port) {
  console.error("Unable to determine a dev server port.");
  process.exit(1);
}

console.log(`Starting Vite on random port ${port}`);

const child = spawn(
  "bunx",
  ["vite", "--host", "0.0.0.0", "--port", port, "--strictPort"],
  { stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
