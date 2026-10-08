#!/usr/bin/env python3
"""The bridge, wired the way it runs behind mavlink-router on the Pi.

A STAND-IN for the router, implementing the two endpoint behaviours the Pi's
mavlink-router.conf relies on:
  Normal (bridge_telemetry): forward everything from the aircraft to 14551.
  Server (bridge_commands):  listen on 14560, learn the peer from its first
                             packet, forward its packets to the aircraft and
                             the aircraft's traffic back to it.
It proves the BRIDGE is wired correctly for that topology. It does not prove
the real mavlink-router behaves this way -- the Pi installer's link check does.
"""
import json, os, socket, subprocess, sys, threading, time, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from pymavlink.dialects.v20 import ardupilotmega as mavlink

UART, TELEM, CMD, HTTP = 14701, 14702, 14703, 8171
stop = threading.Event()
seen = {'cmd_from': None}

# --- aircraft on the "UART" (a UDP socket standing in for the serial port) ---
def aircraft():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind(('127.0.0.1', UART)); sock.settimeout(0.2)
    class Out:
        def write(self, d): sock.sendto(d, ('127.0.0.1', UART + 100))   # to router
    mav = mavlink.MAVLink(Out(), srcSystem=1, srcComponent=1); parser = mavlink.MAVLink(None)
    last = 0
    while not stop.is_set():
        if time.time() - last > 0.25:
            mav.heartbeat_send(2, 3, 128 | 81, 3, 4); last = time.time()   # armed, ArduCopter AUTO
        try: d, _ = sock.recvfrom(2048)
        except socket.timeout: continue
        for m in parser.parse_buffer(d) or []:
            if m.get_type() == 'COMMAND_LONG':
                seen['cmd_from'] = m.get_srcSystem()
                mav.command_ack_send(m.command, mavlink.MAV_RESULT_ACCEPTED)

# --- the router stand-in -------------------------------------------------------
def router():
    up = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); up.bind(('127.0.0.1', UART + 100)); up.settimeout(0.05)
    tele = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)                       # Normal: just sends
    srv = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); srv.bind(('127.0.0.1', CMD)); srv.settimeout(0.05)
    peer = None                                                                    # Server: learned
    while not stop.is_set():
        try:
            d, _ = up.recvfrom(4096)
            tele.sendto(d, ('127.0.0.1', TELEM))
            if peer: srv.sendto(d, peer)
        except socket.timeout: pass
        try:
            d, addr = srv.recvfrom(4096); peer = addr
            up.sendto(d, ('127.0.0.1', UART))
        except socket.timeout: pass

for f in (aircraft, router): threading.Thread(target=f, daemon=True).start()
proc = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(TELEM), '--http-port', str(HTTP),
                         '--command-link', f'udpout:127.0.0.1:{CMD}'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
try:
    end = time.time() + 20
    while time.time() < end:
        try:
            if json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/health', timeout=1).read())['connected']: break
        except Exception: pass
        time.sleep(0.2)
    health = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/health').read())
    req = urllib.request.Request(f'http://127.0.0.1:{HTTP}/command', data=json.dumps({'command': 'rtl'}).encode(),
                                 headers={'Content-Type': 'application/json'})
    rtl = json.loads(urllib.request.urlopen(req, timeout=10).read())
finally:
    proc.terminate(); stop.set()

checks = [
    ('telemetry arrives via the Normal endpoint (14551 role)', health['connected']),
    ('RTL sent via the Server endpoint reaches the aircraft', seen['cmd_from'] is not None),
    ('the aircraft sees the bridge as system 254, not QGC\'s 255', seen['cmd_from'] == 254),
    ('the ACK finds its way back to the bridge', rtl.get('ok') is True),
]
bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'router topology verified (stand-in router)' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
