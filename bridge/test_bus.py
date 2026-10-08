#!/usr/bin/env python3
"""Regression test for audit finding #3: other components on the bus.

A real MAVLink bus carries a gimbal, camera and radio alongside the autopilot.
None of them may change what the GCS shows about the aircraft.
"""
import json, socket, struct, subprocess, sys, time, urllib.request

def _wait_ready(port, limit=20.0):
    """Poll until the bridge answers, instead of guessing with a fixed sleep:
    a cold start (iCloud-synced files, a slow Pi SD card) can take seconds."""
    import time as _t, urllib.request as _u
    end = _t.time() + limit
    while _t.time() < end:
        try:
            _u.urlopen(f'http://127.0.0.1:{port}/health', timeout=1); return
        except Exception:
            _t.sleep(0.1)
    raise SystemExit(f'bridge on :{port} never became ready')


UDP, HTTP = 14611, 8111
def v2(msgid, payload, sysid=1, compid=1):
    return (bytes([0xFD, len(payload), 0, 0, 0, sysid, compid,
                   msgid & 0xFF, (msgid >> 8) & 0xFF, (msgid >> 16) & 0xFF]) + payload + b'\0\0')

proc = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(UDP),
                         '--http-port', str(HTTP)], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
_wait_ready(HTTP)
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
send = lambda b: s.sendto(b, ('127.0.0.1', UDP))
get = lambda: json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/telemetry', timeout=3).read())

checks = []
try:
    # 1. a radio (sysid 51) says RADIO_STATUS before any aircraft exists
    send(v2(109, struct.pack('<HHBBBBB', 0, 0, 200, 190, 90, 40, 38), sysid=51, compid=68))
    time.sleep(0.4)
    checks.append(('radio alone does not create a phantom vehicle', get()['connected'] is False))

    # 2. the autopilot arms in AUTO
    send(v2(0, struct.pack('<IBBBBB', 3, 2, 3, 128 | 81, 4, 3)))
    time.sleep(0.4)
    f = get()['vehicles'][0]
    checks.append(('autopilot heartbeat -> armed, auto', f['isArmed'] and f['flightMode'] == 'auto'))

    # 3. the gimbal (same sysid, compid 154) heartbeats disarmed / INVALID autopilot
    for _ in range(3):
        send(v2(0, struct.pack('<IBBBBB', 0, 26, 8, 0, 4, 3), compid=154))
        time.sleep(0.15)
    f = get()['vehicles'][0]
    checks.append(('gimbal heartbeat does not disarm the aircraft', f['isArmed'] is True))
    checks.append(('gimbal heartbeat does not change flight mode', f['flightMode'] == 'auto'))

    # 4. QGC's own heartbeat (sysid 255, type GCS) is not an aircraft
    send(v2(0, struct.pack('<IBBBBB', 0, 6, 8, 0, 4, 3), sysid=255, compid=190))
    time.sleep(0.3)
    checks.append(('ground station is not listed as a vehicle', len(get()['vehicles']) == 1))

    # 5. the radio's RADIO_STATUS still reaches the real aircraft as link data
    send(v2(109, struct.pack('<HHBBBBB', 0, 0, 127, 120, 90, 40, 38), sysid=51, compid=68))
    time.sleep(0.3)
    checks.append(('radio signal applied to the aircraft', get()['vehicles'][0]['signalStrength'] == 50))
finally:
    proc.terminate()

bad = 0
for label, ok in checks:
    bad += not ok
    print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'bus handling verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
