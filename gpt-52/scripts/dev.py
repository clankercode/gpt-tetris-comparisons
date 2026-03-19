import socket
import subprocess
import sys


def pick_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return int(port)


def main() -> int:
    port = pick_free_port()
    print(f"[dev] Vite port: {port}")
    cmd = ["bunx", "vite", "--port", str(port), "--host"]
    cmd.extend(sys.argv[1:])
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())

