#!/usr/bin/env python3
"""Generate a random available port for the Vite dev server."""

import random
import socket


def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("", port))
            return True
        except OSError:
            return False


def get_random_port() -> int:
    attempts = 0
    while attempts < 50:
        port = random.randint(3000, 9000)
        if is_port_available(port):
            return port
        attempts += 1
    # Fallback: let OS pick one
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


if __name__ == "__main__":
    print(get_random_port())
