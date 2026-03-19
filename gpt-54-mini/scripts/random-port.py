#!/usr/bin/env python3
import random
import sys


def choose_port() -> int:
    return random.SystemRandom().randint(49152, 65535)


if __name__ == "__main__":
    sys.stdout.write(f"{choose_port()}\n")
