#!/usr/bin/env python3
"""Mission upload: the aircraft-driven handshake, autopilot differences, safety."""
import json, os, socket, subprocess, sys, threading, time, urllib.error, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
os.environ.setdefault('MAVLINK20', '1')
from pymavlink.dialects.v20 import ardupilotmega as M

WPS = [{'lat': 28.6189, 'lng': 77.3013, 'alt': 40}, {'lat': 28.6186, 'lng': 77.3024, 'alt': 45},
       {'lat': 28.6185, 'lng': 77.3036, 'alt': 50}]

def run(autopilot, armed=False, lossy=False, port=0):
    TELEM, CMD, HTTP = 15001 + port, 15002 + port, 8301 + port
    got = {'items': {}, 'count': None}; stop = threading.Event()
    def vehicle():
        tx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        class T:
            def write(self, d): tx.sendto(d, ('127.0.0.1', TELEM))
        tm = M.MAVLink(T(), srcSystem=1, srcComponent=1)
        cs = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); cs.bind(('127.0.0.1', CMD)); cs.settimeout(0.05)
        class O:
            peer = None
            def write(self, d):
                if self.peer: cs.sendto(d, self.peer)
        o = O(); m = M.MAVLink(o, srcSystem=1, srcComponent=1); parser = M.MAVLink(None)
        last = 0; dropped = set()
        while not stop.is_set():
            if time.time() - last > 0.25:
                tm.heartbeat_send(2, autopilot, (128 | 81) if armed else 81, 3, 4); last = time.time()
            try: d, a = cs.recvfrom(4096)
            except socket.timeout: continue
            o.peer = a
            for msg in parser.parse_buffer(d) or []:
                t = msg.get_type()
                if t == 'MISSION_COUNT':
                    got['count'] = msg.count; got['items'] = {}
                    m.mission_request_int_send(254, 190, 0, 0)
                elif t == 'MISSION_ITEM_INT':
                    if lossy and msg.seq not in dropped:          # pretend the item was lost
                        dropped.add(msg.seq); m.mission_request_int_send(254, 190, msg.seq, 0); continue
                    got['items'][msg.seq] = (msg.command, msg.x / 1e7, msg.y / 1e7, msg.z)
                    if msg.seq + 1 < got['count']:
                        m.mission_request_int_send(254, 190, msg.seq + 1, 0)
                    else:
                        m.mission_ack_send(254, 190, M.MAV_MISSION_ACCEPTED, 0)
    threading.Thread(target=vehicle, daemon=True).start()
    p = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(TELEM), '--http-port', str(HTTP),
                          '--command-link', f'udpout:127.0.0.1:{CMD}'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        for _ in range(200):
            try:
                if json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/health', timeout=1).read())['connected']: break
            except Exception: pass
            time.sleep(0.1)
        req = urllib.request.Request(f'http://127.0.0.1:{HTTP}/mission', data=json.dumps({'waypoints': WPS}).encode(),
                                     headers={'Content-Type': 'application/json'})
        try: r = json.loads(urllib.request.urlopen(req, timeout=40).read())
        except urllib.error.HTTPError as e: r = json.loads(e.read())
        return r, got
    finally:
        p.terminate(); stop.set(); time.sleep(0.3)

checks = []
r, g = run(3, port=0)
cmds = [g['items'][i][0] for i in sorted(g['items'])]
checks.append(('ArduPilot: accepted', r.get('ok') is True))
checks.append(('ArduPilot: home placeholder, takeoff, 3 waypoints, RTL (6 items)', cmds == [16, 22, 16, 16, 16, 20]))
checks.append(('ArduPilot: waypoint 2 at 45 m, right place', abs(g['items'][3][1] - 28.6186) < 1e-6 and g['items'][3][3] == 45))
r, g = run(12, port=10)
cmds = [g['items'][i][0] for i in sorted(g['items'])]
checks.append(('PX4: NO home placeholder (5 items, starts with takeoff)', r.get('ok') and cmds == [22, 16, 16, 16, 20]))
r, g = run(3, lossy=True, port=20)
checks.append(('lossy link: every item re-requested once, still accepted', r.get('ok') is True and len(g['items']) == 6))
r, g = run(3, armed=True, port=30)
checks.append(('refused while armed, nothing sent', r.get('ok') is False and 'land' in r.get('error', '') and g['count'] is None))

bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'mission upload verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
