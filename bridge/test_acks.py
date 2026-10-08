#!/usr/bin/env python3
"""Regression test for audit finding #7: ACK correlation.

PAUSE and RESUME are the same MAVLink command (193). This vehicle accepts one
and denies the other, and the two requests are fired at the same moment, so a
bridge that matches ACKs by command id alone hands one request the other's
verdict. A second, impostor system also sends ACKs, which must be ignored.
"""
import json, os, socket, subprocess, sys, threading, time, urllib.error, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from pymavlink.dialects.v20 import ardupilotmega as mavlink

VPORT, HTTP, UDP = 14790, 8091, 14791

def vehicle(stop):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('127.0.0.1', VPORT)); sock.settimeout(0.3)
    class Out:
        peer = None
        def __init__(self, src): self.src = src
        def write(self, d): sock.sendto(d, self.peer)
    real, fake = Out(1), Out(9)
    m_real = mavlink.MAVLink(real, srcSystem=1, srcComponent=1)
    m_fake = mavlink.MAVLink(fake, srcSystem=9, srcComponent=1)   # impostor
    parser = mavlink.MAVLink(None)
    while not stop.is_set():
        try: data, addr = sock.recvfrom(2048)
        except socket.timeout: continue
        real.peer = fake.peer = addr
        for m in parser.parse_buffer(data) or []:
            if m.get_type() != 'COMMAND_LONG': continue
            # impostor answers first, always "accepted"
            m_fake.command_ack_send(m.command, mavlink.MAV_RESULT_ACCEPTED)
            time.sleep(0.2)
            verdict = (mavlink.MAV_RESULT_ACCEPTED if m.param1 == 0
                       else mavlink.MAV_RESULT_DENIED)          # pause ok, resume denied
            m_real.command_ack_send(m.command, verdict)

def post(cmd, out, key):
    req = urllib.request.Request(f'http://127.0.0.1:{HTTP}/command',
        data=json.dumps({'command': cmd}).encode(), headers={'Content-Type': 'application/json'})
    try: out[key] = json.loads(urllib.request.urlopen(req, timeout=10).read())
    except urllib.error.HTTPError as e: out[key] = json.loads(e.read())

stop = threading.Event(); threading.Thread(target=vehicle, args=(stop,), daemon=True).start()
proc = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(UDP), '--http-port', str(HTTP),
                         '--command-link', f'udpout:127.0.0.1:{VPORT}'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
end = time.time() + 20
while time.time() < end:
    try: urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/health', timeout=1); break
    except Exception: time.sleep(0.1)
time.sleep(0.5)

res = {}
try:
    ts = [threading.Thread(target=post, args=('pause', res, 'pause')),
          threading.Thread(target=post, args=('resume', res, 'resume'))]
    [t.start() for t in ts]; [t.join() for t in ts]
finally:
    proc.terminate(); stop.set()

print(f"  pause  -> {res['pause']}")
print(f"  resume -> {res['resume']}")
checks = [
    ('PAUSE gets its own verdict (accepted)', res['pause'].get('ok') is True),
    ('RESUME gets its own verdict (denied), not PAUSE\'s', res['resume'].get('ok') is False
        and res['resume'].get('result') == 'MAV_RESULT_DENIED'),
    ('impostor system\'s "accepted" was ignored', res['resume'].get('result') != 'MAV_RESULT_ACCEPTED'),
]
bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'ack correlation verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
