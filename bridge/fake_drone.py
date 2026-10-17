#!/usr/bin/env python3
"""Pretends to be an aircraft so the GCS can be tested without one.

Sends telemetry to the bridge, and — if pymavlink is importable — also listens
for COMMAND_LONG on a second port and answers with COMMAND_ACK, so RTL and
TAKEOFF can be exercised end to end from the interface.

    python3 fake_drone.py [telemetry-port] [command-port]
"""
import math, socket, struct, sys, threading, time
import os as _os, sys as _sys
_v = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'vendor')
if _os.path.isdir(_v) and _v not in _sys.path:
    _sys.path.insert(0, _v)   # find a local pymavlink without PYTHONPATH

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 14551
CMD_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 14552
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
seq = 0


# A small survey mission, as QGroundControl would have uploaded it:
# home, takeoff, 6 waypoints, return-to-launch.
MISSION = ([(16, 28.618939, 77.301383, 0), (22, 28.618939, 77.301383, 30)]
           + [(16, 28.6186 - 0.00005 * k, 77.3024 + 0.0012 * k, 40) for k in range(6)]
           + [(20, 0.0, 0.0, 0)])


def serve_commands():
    """Accept COMMAND_LONG and acknowledge it, the way an autopilot would."""
    try:
        from pymavlink.dialects.v20 import ardupilotmega as mavlink
    except ImportError:
        print('  (no pymavlink -> telemetry only, commands will not be answered)')
        return

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('0.0.0.0', CMD_PORT))

    class Out:
        peer = None
        def write(self, data):
            if self.peer:
                sock.sendto(data, self.peer)

    out = Out()
    mav = mavlink.MAVLink(out, srcSystem=1, srcComponent=1)
    upload = {'n': 0, 'items': []}
    print(f'  commands  <- udp://0.0.0.0:{CMD_PORT}')
    while True:
        data, addr = sock.recvfrom(2048)
        out.peer = addr
        try:
            for m in mav.parse_buffer(data) or []:
                # Upload: the aircraft drives it, requesting each item in turn.
                if m.get_type() == 'MISSION_COUNT':
                    upload['n'] = m.count; upload['items'] = []
                    mav.mission_request_int_send(m.get_srcSystem(), m.get_srcComponent(), 0, 0)
                elif m.get_type() == 'MISSION_ITEM_INT' and upload.get('n'):
                    upload['items'].append((m.command, m.x / 1e7, m.y / 1e7, m.z))
                    if len(upload['items']) < upload['n']:
                        mav.mission_request_int_send(m.get_srcSystem(), m.get_srcComponent(), len(upload['items']), 0)
                    else:
                        MISSION[:] = upload['items']; upload['n'] = 0
                        print(f'  [vehicle] new mission stored: {len(MISSION)} items')
                        mav.mission_ack_send(m.get_srcSystem(), m.get_srcComponent(), 0, 0)
                elif m.get_type() == 'MISSION_REQUEST_LIST':
                    mav.mission_count_send(m.get_srcSystem(), m.get_srcComponent(), len(MISSION), 0)
                elif m.get_type() == 'MISSION_REQUEST_INT' and m.seq < len(MISSION):
                    cmd, lat, lng, alt = MISSION[m.seq]
                    mav.mission_item_int_send(m.get_srcSystem(), m.get_srcComponent(), m.seq, 3, cmd,
                                              0, 1, 0, 0, 0, 0, int(lat * 1e7), int(lng * 1e7), alt, 0)
                elif m.get_type() == 'COMMAND_LONG':
                    name = mavlink.enums['MAV_CMD'][m.command].name \
                        if m.command in mavlink.enums['MAV_CMD'] else str(m.command)
                    print(f'  [vehicle] got {name} -> ACCEPTED')
                    mav.command_ack_send(m.command, mavlink.MAV_RESULT_ACCEPTED)
        except Exception:
            pass


threading.Thread(target=serve_commands, daemon=True).start()

def v2(msgid, payload):
    global seq
    seq = (seq + 1) % 256
    pkt = (bytes([0xFD, len(payload), 0, 0, seq, 1, 1,
                  msgid & 0xFF, (msgid >> 8) & 0xFF, (msgid >> 16) & 0xFF])
           + payload + b'\x00\x00')
    s.sendto(pkt, ('127.0.0.1', PORT))

print(f'fake drone\n  telemetry -> udp://127.0.0.1:{PORT}  (ctrl-c to stop)')
t = 0.0
while True:
    lat = 28.535517 + 0.0009 * math.sin(t / 12)
    lng = 77.191632 + 0.0009 * math.cos(t / 12)
    alt = 45 + 4 * math.sin(t / 5)
    spd = 8.0 + 1.5 * math.sin(t / 7)
    hdg = int((t * 6) % 360)
    batt = max(20, 92 - int(t / 4))

    v2(0,  struct.pack('<IBBBBB', 3, 2, 3, 128 | 81, 4, 3))
    v2(33, struct.pack('<IiiiihhhH', int(t * 1000), int(lat * 1e7), int(lng * 1e7),
                       220000, int(alt * 1000), 0, 0, 0, hdg * 100))
    v2(1,  struct.pack('<IIIHHhHHHHHHb', 0, 0, 0, 250, int(22.1 * 1000), 500,
                       0, 0, 0, 0, 0, 0, batt))
    v2(24, struct.pack('<QiiiHHHHBB', 0, int(lat * 1e7), int(lng * 1e7), 220000,
                       100, 100, 0, 0, 3, 18))
    v2(74, struct.pack('<ffffhH', spd + 1, spd, alt, 0.2, hdg, 60))
    v2(109, struct.pack('<HHBBBBB', 0, 0, 231, 225, 98, 40, 38))
    # MISSION_CURRENT: advance one item every 8 s, so progress is visible
    v2(42, struct.pack('<HHBB', min(int(t / 8) + 1, len(MISSION) - 1), len(MISSION), 2, 1))
    time.sleep(0.2)
    t += 0.2
