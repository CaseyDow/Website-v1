import socket
import websockets
from threading import Thread
from random import randint
import struct
from sys import argv

data = {}
PORT = 17891
games = ["tapp", "nvwk"]


def start_server():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('', PORT))
    while True:
        s.listen()
        c, addr = s.accept()
        Thread(target=handle_client, args=(c, addr[0],)).start()


def handle_client(c, addr):
    request = c.recv(2048).decode()
    if not request:
        c.close()
        return
    if "websocket" in request:
        headers = {}
        for line in request.split("\r\n")[1:-2]:
            name, data = line.split(": ")
            headers[name] = data
        headers = websockets.http.Headers(headers)
        key = websockets.handshake.check_request(headers)
        websockets.handshake.build_response(headers, key)
        response = ("HTTP/1.1 101 Switching Protocols\r\n"
                    "Upgrade: websocket\r\n"
                    "Connection: Upgrade\r\n"
                    "Sec-WebSocket-Accept: %s\r\n\r\n"
                    % headers["Sec-WebSocket-Accept"])
        c.sendall(response.encode('utf-8'))
        Thread(target=webserver, args=(c,)).start()
    else:
        request = request.split("\r\n")
        try:
            c.sendall(http_response(request[0].split(" ")[1], addr, request[1].split(" ")[1]))
        except FileNotFoundError:
            c.sendall(http_response("/", addr, request[1].split(" ")[1]))
            print("Error: FileNotFoundError")
        except BrokenPipeError:
            print("Error: BrokenPipeError")
        c.close()


def decoded(request):
    if not request:
        return ""
    byte_list = [character for character in request]
    length = byte_list[1] & 127
    first = 4 if length == 126 else 10 if length == 127 else 2
    masks = [m for m in byte_list[first : first + 4]]
    message = ""
    for i in range(len(byte_list) - first - 4):
        message += chr(byte_list[i + first + 4] ^ masks[i % 4])
    return message


def send(c, message):
    opcode, bytes = websockets.framing.prepare_data(message)
    frame = websockets.framing.Frame(True, opcode, bytes)
    head1 = (
        (0b10000000 if frame.fin else 0)
        | (0b01000000 if frame.rsv1 else 0)
        | (0b00100000 if frame.rsv2 else 0)
        | (0b00010000 if frame.rsv3 else 0)
        | frame.opcode
    )
    head2 = 0b10000000 if False else 0
    length = len(frame.data)
    if length < 126:
        request = struct.pack("!BB", head1, head2 | length)
    elif length < 65536:
        request = struct.pack("!BBH", head1, head2 | 126, length)
    else:
        request = struct.pack("!BBQ", head1, head2 | 127, length)
    c.sendall(request + frame.data)


def webserver(c):
    while True:
        request = decoded(c.recv(2048))
        if not request:
            for key, value in data.items():
                if c in value:
                    data[key][value.index(c)] = None
            c.close()
            return
        if request.startswith("Ga"):
            num = randint(100, 999)
            while num in data:
                num = randint(100, 999)
            send(c, "Code:%d" % num)
            data[num] = [None] * (int(request.split(";;")[1]) + 1)
            data[num][0] = request[2:]
            data[num].append("")
            request = str(num) + "0"
        id = int(request[0:3])
        if request[3:] == "0":
            if id not in data:
                send(c, "Error: No game found")
                continue
            if None not in data[id]:
                send(c, "Error: This game is full")
            else:
                send(c, "%s%d;%s" % (data[id][0][:3], data[id].index(None), data[id][0][3:]) + data[id][-1])
                data[id][data[id].index(None)] = c
        else:
            data[id][-1] += "//" + request[3:]
            for client in data[id][1:-1]:
                if client is not None:
                    send(client, request[3:])


def http_response(path, addr, host):
    old_path = path
    if path == "/":
        path = "/index.html"
    if path.strip("/") in games:
        path = "/resources/index.html"
    file = open(argv[0].rsplit('/', 1)[0] + path, 'rb').read()
    if path == "/main.js":
        file = file.decode().replace("localhost", host.split(":")[0]).encode()
    if path == "/resources/index.html":
        file = file.decode().replace("name", old_path.strip("/")).encode()
    if "images" in path:
        return b"HTTP/1.1 200 OK\r\nContent-Type: image/png\r\n\r\n%s" % file
    else:
        return b"HTTP/1.1 200 OK\r\n\r\n%s" % file


if __name__ == '__main__':
    start_server()
