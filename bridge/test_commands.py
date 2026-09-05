#!/usr/bin/env python3
"""End-to-end command test: GCS -> bridge -> aircraft -> ACK -> GCS.

Stands up a fake vehicle that decodes COMMAND_LONG with pymavlink and answers
with COMMAND_ACK, so the encoding, the targeting and the acknowledgement path
are all exercised for real. Only the radio is missing.
"""
import json, socket, subprocess, sys, threading, time, urllib.error, urllib.request
from pymavlink.dialects.v20 import ardupilotmega as mavlink

PY, VPORT, HTTP, UDP = sys.executable, 14780, 8087, 14781
received = []


class _Out:
    def __init__(self, sock): self.sock, self.peer = sock, None
    def write(self, data):
        if self.peer: self.sock.sendto(data, self.peer)


def fake_vehicle(stop):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('127.0.0.1', VPORT)); sock.settimeout(0.3)
    out = _Out(sock)
    mav = mavlink.MAVLink(out, srcSystem=1, srcComponent=1)
    while not stop.is_set():
        try:
            data, addr = sock.recvfrom(2048)
        except socket.timeout:
            continue
        out.peer = addr
        try:
            for m in mav.parse_buffer(data) or []:
                if m.get_type() == 'COMMAND_LONG':
                    received.append(m.command)
                    mav.command_ack_send(m.command, mavlink.MAV_RESULT_ACCEPTED)
        except Exception:
            pass


def post(cmd, **extra):
    body = json.dumps({'command': cmd, **extra}).encode()
    req = urllib.request.Request(f'http://127.0.0.1:{HTTP}/command', data=body,
                                 headers={'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=6).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def run(allow_arm):
    stop = threading.Event()
    threading.Thread(target=fake_vehicle, args=(stop,), daemon=True).start()
    cmd = [PY, 'mavlink_bridge.py', '--udp-port', str(UDP), '--http-port', str(HTTP),
           '--command-link', f'udpout:127.0.0.1:{VPORT}']
    if allow_arm:
        cmd.append('--allow-arm')
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(2.5)
    try:
        return {
            'rtl':     post('rtl'),
            'land':    post('land'),
            'hold':    post('hold'),
            'takeoff': post('takeoff', altitude=30),
            'bogus':   post('explode'),
        }
    finally:
        proc.terminate(); stop.set(); time.sleep(0.5)


print('=== commanding ON, arm/takeoff BLOCKED (no --allow-arm) ===')
locked = run(allow_arm=False)
for k, v in locked.items():
    print(f'  {k:9} ok={str(v.get("ok")):5}  {v.get("result") or v.get("error","")}')

received.clear()
print()
print('=== commanding ON, arm/takeoff ALLOWED (--allow-arm) ===')
armed = run(allow_arm=True)
for k, v in armed.items():
    print(f'  {k:9} ok={str(v.get("ok")):5}  {v.get("result") or v.get("error","")}')

print()
checks = [
    ('RTL accepted by the aircraft',            locked['rtl']['ok'] is True),
    ('LAND accepted',                           locked['land']['ok'] is True),
    ('PAUSE accepted',                          locked['hold']['ok'] is True),
    ('TAKEOFF blocked without --allow-arm',     locked['takeoff']['ok'] is False
                                                and 'allow-arm' in locked['takeoff']['error']),
    ('unknown command rejected',                locked['bogus']['ok'] is False),
    ('TAKEOFF accepted with --allow-arm',       armed['takeoff']['ok'] is True),
    ('NAV_TAKEOFF (22) reached the aircraft',   22 in received),
]
bad = 0
for label, ok in checks:
    if not ok: bad += 1
    print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print()
print('RESULT:', 'command path verified' if bad == 0 else f'{bad} check(s) failed')
sys.exit(1 if bad else 0)
