#!/usr/bin/env python3
"""Mission read-back: lossy link, a command mid-download, caching, change detection."""
import json, os, socket, subprocess, sys, threading, time, urllib.error, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from pymavlink.dialects.v20 import ardupilotmega as mavlink

TELEM, CMD, HTTP = 14951, 14952, 8251
M = mavlink
def wp(seq, cmd, lat, lng, alt):
    return dict(seq=seq, cmd=cmd, lat=int(lat * 1e7), lng=int(lng * 1e7), alt=alt)
MISSION = [wp(0, 16, 28.6189, 77.3013, 0),          # home
           wp(1, 22, 28.6189, 77.3013, 30),         # takeoff
           wp(2, 16, 28.6186, 77.3024, 40), wp(3, 16, 28.6185, 77.3036, 40),
           wp(4, 178, 0, 0, 0),                     # DO_CHANGE_SPEED: not a place
           wp(5, 16, 28.6184, 77.3047, 40),
           wp(6, 20, 0, 0, 0)]                      # RTL: not a place either
state = {'mission': MISSION, 'list_requests': 0, 'dropped': set(), 'cmd_acked': 0, 'seq': 3}
stop = threading.Event()

def vehicle():
    tx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)               # telemetry -> bridge
    class TOut:
        def write(self, d): tx.sendto(d, ('127.0.0.1', TELEM))
    tm = M.MAVLink(TOut(), srcSystem=1, srcComponent=1)
    cs = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); cs.bind(('127.0.0.1', CMD)); cs.settimeout(0.05)
    class COut:
        peer = None
        def write(self, d):
            if self.peer: cs.sendto(d, self.peer)
    cout = COut(); cm = M.MAVLink(cout, srcSystem=1, srcComponent=1); parser = M.MAVLink(None)
    last = 0
    while not stop.is_set():
        if time.time() - last > 0.25:
            tm.heartbeat_send(2, 3, 128 | 81, 3, 4)
            tm.mission_current_send(state['seq'], len(state['mission']), 0, 0); last = time.time()
        try: d, a = cs.recvfrom(4096)
        except socket.timeout: continue
        cout.peer = a
        for msg in parser.parse_buffer(d) or []:
            t = msg.get_type()
            if t == 'MISSION_REQUEST_LIST':
                state['list_requests'] += 1
                cm.mission_count_send(254, 190, len(state['mission']), 0)
            elif t == 'MISSION_REQUEST_INT':
                if msg.seq not in state['dropped']:            # lossy radio: lose the first ask
                    state['dropped'].add(msg.seq); continue
                w = state['mission'][msg.seq]
                cm.mission_item_int_send(254, 190, w['seq'], 3, w['cmd'], 0, 1, 0, 0, 0, 0,
                                         w['lat'], w['lng'], w['alt'], 0)
            elif t == 'COMMAND_LONG':
                state['cmd_acked'] += 1
                cm.command_ack_send(msg.command, M.MAV_RESULT_ACCEPTED)

threading.Thread(target=vehicle, daemon=True).start()
proc = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(TELEM), '--http-port', str(HTTP),
                         '--command-link', f'udpout:127.0.0.1:{CMD}'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
def get(path):
    try: return json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}{path}', timeout=30).read())
    except urllib.error.HTTPError as e: return json.loads(e.read())
def post(cmd, out):
    r = urllib.request.Request(f'http://127.0.0.1:{HTTP}/command', data=json.dumps({'command': cmd}).encode(),
                               headers={'Content-Type': 'application/json'})
    out['r'] = json.loads(urllib.request.urlopen(r, timeout=30).read())
checks = []
try:
    for _ in range(200):
        try:
            if get('/health')['connected']: break
        except Exception: pass
        time.sleep(0.1)
    time.sleep(0.5)
    tel = get('/telemetry')['vehicles'][0]
    checks.append(('current waypoint + total come through telemetry', tel['missionSeq'] == 3 and tel['missionTotal'] == 7))

    # first download, with an RTL fired at the same time
    cmd_out = {}
    t = threading.Thread(target=post, args=('rtl', cmd_out)); t.start()
    m = get('/mission'); t.join()
    checks.append(('full mission read despite every item being lost once', m.get('ok') and m.get('count') == 7))
    # 7 items: ArduPilot home, take-off, 3 waypoints, a speed change, RTL.
    # Only the 3 planned places are waypoints.
    checks.append(('only planned places kept as waypoints (3 of 7 items)', len(m.get('waypoints', [])) == 3))
    checks.append(('coordinates decoded', abs(m['waypoints'][0]['lat'] - 28.6186) < 1e-6 if m.get('ok') else False))
    checks.append(('command issued mid-download still got its ACK', cmd_out.get('r', {}).get('ok') is True))

    before = state['list_requests']; get('/mission')
    checks.append(('second read is served from cache', state['list_requests'] == before))

    state['mission'] = MISSION[:4]; state['dropped'] = set(); time.sleep(0.6)   # QGC uploads a new plan
    m2 = get('/mission')
    checks.append(('changed mission on the aircraft triggers a fresh read', m2.get('count') == 4 and state['list_requests'] == before + 1))
finally:
    proc.terminate(); stop.set()

# no command link -> clear error, not a hang
p2 = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', '14953', '--http-port', '8252'],
                      stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
try:
    for _ in range(100):
        try: urllib.request.urlopen('http://127.0.0.1:8252/health', timeout=1); break
        except Exception: time.sleep(0.1)
    try: urllib.request.urlopen('http://127.0.0.1:8252/mission', timeout=5); code = 200
    except urllib.error.HTTPError as e: code = e.code
    checks.append(('without a command link: 503, not a hang', code == 503))
finally:
    p2.terminate()

bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'mission read-back verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
