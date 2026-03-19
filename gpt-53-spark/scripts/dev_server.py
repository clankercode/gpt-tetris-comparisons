#!/usr/bin/env python3
import argparse
import os
import random
import subprocess
from pathlib import Path


def pick_port(start: int, end: int) -> int:
  return random.randint(start, end)


def main() -> None:
  parser = argparse.ArgumentParser(description="Start Vite on a random port")
  parser.add_argument("--min-port", type=int, default=3200)
  parser.add_argument("--max-port", type=int, default=9000)
  parser.add_argument("--host", type=str, default="0.0.0.0")
  args = parser.parse_args()

  if args.min_port >= args.max_port:
    raise SystemExit("min-port must be lower than max-port")

  root = Path(__file__).resolve().parents[1]
  os.chdir(root)
  attempts = 25
  for attempt in range(attempts):
    port = pick_port(args.min_port, args.max_port)
    print(f"[dev] Starting Vite on random port {port}")
    proc = subprocess.run(
      [
        "bun",
        "run",
        "vite",
        "--host",
        args.host,
        "--port",
        str(port)
      ],
      capture_output=True,
      text=True,
      cwd=str(root)
    )
    if proc.returncode == 0:
      return
    if proc.returncode == 130:
      return
    if attempt < attempts - 1:
      output = (proc.stderr or "") + (proc.stdout or "")
      if "EADDRINUSE" in output:
        print(f"[dev] Port {port} is in use. Selecting another...")
        continue
      print(f"[dev] Vite exited unexpectedly ({proc.returncode}).")
      if proc.stdout:
        print(proc.stdout)
      if proc.stderr:
        print(proc.stderr)
      raise RuntimeError(f"[dev] Vite exited with code {proc.returncode} before serving.")

  raise RuntimeError("Unable to start Vite after multiple attempts")


if __name__ == "__main__":
  main()
