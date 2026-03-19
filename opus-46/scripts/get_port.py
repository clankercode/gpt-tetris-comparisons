#!/usr/bin/env python3
"""Bind a TCP socket to port 0 to get a random available port from the OS."""

import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(("127.0.0.1", 0))
port = s.getsockname()[1]
s.close()
print(port)
