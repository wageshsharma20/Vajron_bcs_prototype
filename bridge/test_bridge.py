#!/usr/bin/env python3
"""Feeds the bridge synthetic MAVLink v2 frames and checks what comes out."""
import json, socket, struct, subprocess, sys, time, urllib.request

UDP, HTTP = 14599, 8099

def v2(msgid, payload, sysid=1, seq=0):
    return (bytes([0xFD, len(payload), 0, 0, seq, sysid, 1,
                   msgid & 0xFF, (msgid >> 8) & 0xFF, (msgid >> 16) & 0xFF])
            + payload + b'\x00\x00')          # CRC unvalidated by design

proc = subprocess.Popen(
    [sys.executable, 'mavlink_bridge.py', '--udp-port', str(UDP), '--http-port', str(HTTP)],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
time.sleep(1.5)

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
send = lambda pkt: s.sendto(pkt, ('127.0.0.1', UDP))

# armed, ArduCopter AUTO (custom_mode 3), autopilot 3
send(v2(0,  struct.pack('<IBBBBB', 3, 2, 3, 128 | 81, 4, 3)))
# lat 28.535517  lng 77.191632  rel_alt 45.0m  hdg 90deg
send(v2(33, struct.pack('<IiiiihhhH', 1000, 285355170, 771916320, 220000, 45000, 0, 0, 0, 9000)))
# 22.1 V, 84 % remaining
send(v2(1,  struct.pack('<IIIHHhHHHHHHb', 0, 0, 0, 250, 22100, 500, 0, 0, 0, 0, 0, 0, 84)))
# 3D fix, 18 sats
send(v2(24, struct.pack('<QiiiHHHHBB', 0, 285355170, 771916320, 220000, 100, 100, 0, 0, 3, 18)))
# groundspeed 8.5 m/s
send(v2(74, struct.pack('<ffffhH', 9.0, 8.5, 45.0, 0.2, 90, 60)))
# SiK rssi 200/254
send(v2(109, struct.pack('<HHBBBBB', 0, 0, 200, 195, 98, 40, 38)))
time.sleep(0.7)

got = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{HTTP}/telemetry', timeout=3).read())
proc.terminate()

if not got.get('connected'):
    print('FAIL: bridge reports no vehicle'); print(json.dumps(got, indent=2)); sys.exit(1)

f = got['vehicles'][0]
expect = {
    'lat': 28.535517, 'lng': 77.191632, 'altitude': 45.0, 'heading': 90,
    'groundSpeed': 8.5, 'batteryPercent': 84, 'batteryVoltage': 22.1,
    'gpsFixType': '3d', 'gpsSatsVisible': 18, 'flightMode': 'auto',
    'isArmed': True, 'signalStrength': 79,
}
bad = 0
print(f'{"field":18} {"expected":>14}   {"got":>14}')
for k, want in expect.items():
    have = f.get(k)
    ok = (abs(have - want) < 1e-6) if isinstance(want, float) else (have == want)
    if not ok: bad += 1
    print(f'{k:18} {str(want):>14}   {str(have):>14}   {"" if ok else "  <-- MISMATCH"}')
print()
print('RESULT:', 'all fields decoded correctly' if bad == 0 else f'{bad} field(s) wrong')
sys.exit(1 if bad else 0)
