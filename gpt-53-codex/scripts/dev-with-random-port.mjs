import { spawn, spawnSync } from "node:child_process";

function getRandomPort() {
  const result = spawnSync(
    "python3",
    ["-c", "import random; print(random.randint(12000, 59000))"],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to generate port with python3");
  }

  const parsed = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid port produced by python3: ${result.stdout}`);
  }

  return parsed;
}

const port = getRandomPort();
console.log(`Starting Vite on random port ${port}`);

const child = spawn("vite", ["--port", String(port), "--host"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
