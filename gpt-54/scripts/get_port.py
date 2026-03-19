import socket


def main() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        print(sock.getsockname()[1])


if __name__ == "__main__":
    main()
