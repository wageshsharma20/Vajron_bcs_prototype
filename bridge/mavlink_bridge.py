#!/usr/bin/env python3
"""
MAVLink -> browser bridge for the Vajron GCS.

WHY THIS EXISTS
---------------
The GCS is a web page. A browser cannot open a UDP socket, and MAVLink is a
UDP/serial protocol, so the page can never talk to an aircraft directly. This
process sits in the middle: it speaks MAVLink on one side and plain HTTP on the
other, which is the only thing the page can consume.

    Pixhawk --MAVLink--> QGroundControl --UDP forward--> THIS --SSE--> GCS page

QGroundControl stays in charge of the vehicle. It owns the link, the parameters
and the commanding; this bridge only listens to the copy of the stream QGC
forwards, and reshapes it for the display. Nothing here can fly the aircraft.

Server-Sent Events rather than WebSockets, deliberately: telemetry is one
directional, EventSource reconnects on its own, and SSE needs no handshake, no
frame masking and no dependencies. Python 3 stdlib only, because Raspberry Pi OS
ships python3 and does not ship node, and the field Pi has no internet to
install anything.
"""

import argparse
import json
import math
import socket
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ── MAVLink wire format ──────────────────────────────────────────────────────
# v1: FE | len seq sys comp msgid |            payload | crc(2)
# v2: FD | len incompat compat seq sys comp msgid(3) | payload | crc(2) [+sig]
MAGIC_V1, MAGIC_V2 = 0xFE, 0xFD
HDR_V1, HDR_V2 = 6, 10

# CRC is not validated. The bridge reads a local UDP link — from QGC on the same
# machine, or a directly attached radio — and UDP already carries its own
# checksum. Validating MAVLink's CRC would mean shipping the CRC_EXTRA seed for
# every message id; a single wrong seed silently drops that message type
# forever, which is a far worse failure than the corruption it would catch here.

HEARTBEAT, SYS_STATUS, GPS_RAW_INT = 0, 1, 24
GLOBAL_POSITION_INT, VFR_HUD, RADIO_STATUS = 33, 74, 109

MAV_MODE_FLAG_SAFETY_ARMED = 0x80
AUTOPILOT_ARDUPILOT, AUTOPILOT_PX4 = 3, 12

# Our display only has these eight states, so every autopilot mode is folded
# into the nearest one rather than shown raw.
ARDUCOPTER_MODES = {
    0: 'stabilize', 1: 'manual', 2: 'hold', 3: 'auto', 4: 'auto',
    5: 'loiter', 6: 'rtl', 7: 'loiter', 9: 'land', 16: 'hold',
    17: 'hold', 20: 'auto', 21: 'rtl',
}
PX4_MAIN_MODES = {1: 'manual', 2: 'hold', 3: 'loiter', 5: 'manual', 6: 'auto', 7: 'stabilize'}
PX4_AUTO_SUB = {2: 'auto', 3: 'loiter', 4: 'auto', 5: 'rtl', 6: 'land'}
GPS_FIX = {0: 'none', 1: 'none', 2: '2d', 3: '3d', 4: '3d', 5: 'rtk', 6: 'rtk'}


def _unpack(fmt, payload):
    """Unpack a truncated MAVLink v2 payload.

    v2 drops trailing zero bytes on the wire, so a short frame is normal and not
    an error. Zero-padding back to the declared length is what makes the fixed
    offsets below valid for both versions.
    """
    need = struct.calcsize(fmt)
    if len(payload) < need:
        payload = payload + b'\x00' * (need - len(payload))
    return struct.unpack(fmt, payload[:need])


class Vehicle:
    """Latest known state of one aircraft, keyed by MAVLink system id."""

    def __init__(self, sysid):
        self.sysid = sysid
        self.autopilot = AUTOPILOT_ARDUPILOT
        self.last_seen = time.time()
        self.f = {
            'lat': 0.0, 'lng': 0.0, 'altitude': 0.0, 'heading': 0,
            'groundSpeed': 0.0, 'batteryPercent': 0, 'batteryVoltage': 0.0,
            'signalStrength': 0, 'linkRssi': 0, 'gpsFixType': 'none',
            'gpsSatsVisible': 0, 'flightMode': 'idle', 'isArmed': False,
            'distanceToHome': 0.0,
        }
        self._home = None

    # -- decoders ------------------------------------------------------------
    def heartbeat(self, p):
        custom, _typ, autopilot, base_mode = _unpack('<IBBB', p)[:4]
        self.autopilot = autopilot
        self.f['isArmed'] = bool(base_mode & MAV_MODE_FLAG_SAFETY_ARMED)
        self.f['flightMode'] = self._mode(custom) if self.f['isArmed'] else 'idle'

    def _mode(self, custom):
        if self.autopilot == AUTOPILOT_PX4:
            main, sub = (custom >> 16) & 0xFF, (custom >> 24) & 0xFF
            if main == 4:
                return PX4_AUTO_SUB.get(sub, 'auto')
            return PX4_MAIN_MODES.get(main, 'manual')
        return ARDUCOPTER_MODES.get(custom, 'manual')

    def sys_status(self, p):
        volts = _unpack('<IIIHH', p)[4]           # voltage_battery, millivolts
        remaining = struct.unpack('<b', p[30:31])[0] if len(p) > 30 else -1
        if volts not in (0, 0xFFFF):
            self.f['batteryVoltage'] = round(volts / 1000.0, 2)
        if remaining >= 0:
            self.f['batteryPercent'] = remaining

    def gps_raw(self, p):
        fields = _unpack('<QiiiHHHHBB', p)
        self.f['gpsFixType'] = GPS_FIX.get(fields[8], 'none')
        self.f['gpsSatsVisible'] = 0 if fields[9] == 255 else fields[9]

    def global_position(self, p):
        _t, lat, lon, _alt, rel_alt, _vx, _vy, _vz, hdg = _unpack('<IiiiihhhH', p)
        self.f['lat'] = lat / 1e7
        self.f['lng'] = lon / 1e7
        self.f['altitude'] = round(rel_alt / 1000.0, 1)
        if hdg != 0xFFFF:
            self.f['heading'] = round(hdg / 100.0)
        if self._home is None and self.f['isArmed'] and self.f['gpsFixType'] in ('3d', 'rtk'):
            self._home = (self.f['lat'], self.f['lng'])
        if self._home:
            self.f['distanceToHome'] = round(_haversine(self._home, (self.f['lat'], self.f['lng'])))

    def vfr_hud(self, p):
        _air, ground, _alt, _climb, heading, _thr = _unpack('<ffffhH', p)
        self.f['groundSpeed'] = round(ground, 1)
        self.f['heading'] = heading % 360

    def radio_status(self, p):
        _rxerr, _fixed, rssi, remrssi = _unpack('<HHBB', p)
        # SiK radios report 0-254 where higher is better; QGC shows the same
        # figure as a percentage, so match it rather than inventing a scale.
        self.f['signalStrength'] = min(100, round(rssi / 254.0 * 100))
        self.f['linkRssi'] = rssi - 256 if rssi > 127 else rssi

    def snapshot(self, drone_id):
        out = dict(self.f)
        out['droneId'] = drone_id
        out['timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z'
        out['sysid'] = self.sysid
        out['linkAgeMs'] = round((time.time() - self.last_seen) * 1000)
        return out


def _haversine(a, b):
    r = 6371000.0
    dlat, dlon = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    h = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(h))


class Link:
    """Reads MAVLink frames off a UDP socket and keeps per-vehicle state."""

    def __init__(self, host, port, drone_id):
        self.drone_id = drone_id
        self.vehicles = {}
        self.lock = threading.Lock()
        self.packets = 0
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((host, port))

    def run(self):
        while True:
            try:
                data, _addr = self.sock.recvfrom(4096)
            except OSError:
                continue
            self._feed(data)

    def _feed(self, buf):
        i, n = 0, len(buf)
        while i < n:
            magic = buf[i]
            if magic == MAGIC_V2 and i + HDR_V2 <= n:
                length = buf[i + 1]
                incompat = buf[i + 2]
                msgid = buf[i + 7] | (buf[i + 8] << 8) | (buf[i + 9] << 16)
                sysid, compid = buf[i + 5], buf[i + 6]
                start = i + HDR_V2
                end = start + length
                total = HDR_V2 + length + 2 + (13 if incompat & 0x01 else 0)
            elif magic == MAGIC_V1 and i + HDR_V1 <= n:
                length = buf[i + 1]
                msgid = buf[i + 5]
                sysid, compid = buf[i + 3], buf[i + 4]
                start = i + HDR_V1
                end = start + length
                total = HDR_V1 + length + 2
            else:
                i += 1
                continue
            if end > n:
                break
            self._dispatch(sysid, msgid, buf[start:end])
            i += total

    def _dispatch(self, sysid, msgid, payload):
        # Ground stations and companion computers share the bus; only vehicles
        # are of interest, and sysid 255 is conventionally the GCS itself.
        if sysid == 255:
            return
        with self.lock:
            v = self.vehicles.get(sysid)
            if v is None:
                v = self.vehicles[sysid] = Vehicle(sysid)
                print(f'[link] vehicle {sysid} appeared')
            v.last_seen = time.time()
            self.packets += 1
            try:
                if msgid == HEARTBEAT:
                    v.heartbeat(payload)
                elif msgid == SYS_STATUS:
                    v.sys_status(payload)
                elif msgid == GPS_RAW_INT:
                    v.gps_raw(payload)
                elif msgid == GLOBAL_POSITION_INT:
                    v.global_position(payload)
                elif msgid == VFR_HUD:
                    v.vfr_hud(payload)
                elif msgid == RADIO_STATUS:
                    v.radio_status(payload)
            except (struct.error, IndexError):
                # A malformed frame must never take the bridge down mid-flight.
                pass

    def state(self):
        with self.lock:
            now = time.time()
            live = [v for v in self.vehicles.values() if now - v.last_seen < 5.0]
            if not live:
                return {'connected': False, 'vehicles': [], 'packets': self.packets}
            primary = min(live, key=lambda v: v.sysid)
            return {
                'connected': True,
                'packets': self.packets,
                'vehicles': [primary.snapshot(self.drone_id)],
            }


HTML_HINT = b"""<!doctype html><meta charset=utf-8>
<title>Vajron MAVLink bridge</title>
<body style="font:14px system-ui;padding:2rem;max-width:40rem">
<h1>Vajron MAVLink bridge</h1>
<p>Running. Endpoints:</p>
<ul>
<li><code>GET /telemetry</code> - one JSON snapshot</li>
<li><code>GET /telemetry/stream</code> - Server-Sent Events, 10 Hz</li>
<li><code>GET /health</code> - link state and packet count</li>
</ul>
<p>Point QGroundControl's MAVLink forwarding at this machine's UDP port.</p>
"""


def make_handler(link, rate_hz):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def log_message(self, *_):
            pass  # one client at 10 Hz would otherwise flood the journal

        def _cors(self):
            # The page is served from a different port than this bridge, so the
            # browser treats it as cross-origin even on the same machine.
            self.send_header('Access-Control-Allow-Origin', '*')

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header('Access-Control-Allow-Headers', 'content-type')
            self.end_headers()

        def do_GET(self):
            if self.path.startswith('/telemetry/stream'):
                return self._stream()
            if self.path.startswith('/telemetry'):
                return self._json(link.state())
            if self.path.startswith('/health'):
                s = link.state()
                return self._json({'ok': True, 'connected': s['connected'],
                                   'packets': s['packets']})
            body = HTML_HINT
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def _json(self, obj):
            body = json.dumps(obj).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def _stream(self):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self._cors()
            self.end_headers()
            period = 1.0 / rate_hz
            try:
                while True:
                    payload = json.dumps(link.state())
                    self.wfile.write(f'data: {payload}\n\n'.encode())
                    self.wfile.flush()
                    time.sleep(period)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the page navigated away; EventSource will reconnect

    return Handler


def main():
    ap = argparse.ArgumentParser(description='MAVLink to browser bridge for the Vajron GCS')
    ap.add_argument('--udp-host', default='0.0.0.0', help='UDP bind address for MAVLink in')
    # NOT 14550. QGroundControl binds that port itself to listen for vehicles,
    # so a bridge defaulting to it dies with EADDRINUSE the moment QGC is open
    # -- which is always, since QGC is what forwards the stream here.
    ap.add_argument('--udp-port', type=int, default=14551,
                    help='UDP port QGC forwards to (must differ from QGC\'s own 14550)')
    ap.add_argument('--http-port', type=int, default=8082, help='port the GCS page reads from')
    ap.add_argument('--drone-id', default='DRONE-01', help='which aircraft in the GCS this feeds')
    ap.add_argument('--rate', type=float, default=10.0, help='stream rate in Hz')
    args = ap.parse_args()

    link = Link(args.udp_host, args.udp_port, args.drone_id)
    threading.Thread(target=link.run, daemon=True).start()

    print(f'[bridge] MAVLink in : udp://{args.udp_host}:{args.udp_port}')
    print(f'[bridge] GCS reads  : http://0.0.0.0:{args.http_port}/telemetry/stream')
    print(f'[bridge] feeding    : {args.drone_id} at {args.rate:g} Hz')
    print('[bridge] waiting for a heartbeat...')

    srv = ThreadingHTTPServer(('0.0.0.0', args.http_port), make_handler(link, args.rate))
    srv.daemon_threads = True
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n[bridge] stopped')


if __name__ == '__main__':
    main()
