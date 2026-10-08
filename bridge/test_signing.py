#!/usr/bin/env python3
"""MAVLink 2 signing: verification of telemetry, and signing of commands.

Frames are produced by pymavlink, the reference implementation, so a pass
means the bridge's standard-library verifier agrees with it byte for byte.
"""
import hashlib, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.error, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from pymavlink.dialects.v20 import ardupilotmega as mavlink

KEY = hashlib.sha256(b'vajron field passphrase').digest()
WRONG = hashlib.sha256(b'attacker guess').digest()
keyfile = tempfile.NamedTemporaryFile('w', delete=False, suffix='.key'); keyfile.write('vajron field passphrase'); keyfile.close()

def signer(key, ts):
    m = mavlink.MAVLink(None, srcSystem=1, srcComponent=1)
    if key:
        m.signing.secret_key, m.signing.sign_outgoing, m.signing.link_id, m.signing.timestamp = key, True, 0, ts
    return m

def hb(m, armed):    # ArduCopter AUTO, armed or disarmed
    return m.heartbeat_encode(2, 3, (128 | 81) if armed else 81, 3, 4).pack(m)

def radio(m):
    return m.radio_status_encode(127, 120, 90, 40, 38, 0, 0).pack(m)

def start_bridge(udp, http, *extra):
    p = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(udp), '--http-port', str(http),
                          '--signing-key-file', keyfile.name, *extra], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    for _ in range(200):
        try: urllib.request.urlopen(f'http://127.0.0.1:{http}/health', timeout=1); return p
        except Exception: time.sleep(0.1)
    raise SystemExit('bridge never ready')

def j(url):
    return json.loads(urllib.request.urlopen(url, timeout=3).read())

checks = []
tx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# ---------- A. telemetry, signing REQUIRED ----------
U, H = 14801, 8201
p = start_bridge(U, H, '--require-signed')
try:
    send = lambda b: (tx.sendto(b, ('127.0.0.1', U)), time.sleep(0.25))
    stale = hb(signer(KEY, 1000), armed=False)        # valid, older timestamp, held back
    send(hb(signer(KEY, 2000), armed=True))
    v = j(f'http://127.0.0.1:{H}/telemetry')
    checks.append(('validly signed heartbeat accepted', v['connected'] and v['vehicles'][0]['isArmed']))
    send(hb(signer(WRONG, 3000), armed=False))
    checks.append(('FORGED heartbeat (wrong key) rejected', j(f'http://127.0.0.1:{H}/telemetry')['vehicles'][0]['isArmed']))
    send(hb(signer(None, 0), armed=False))
    checks.append(('UNSIGNED heartbeat rejected when required', j(f'http://127.0.0.1:{H}/telemetry')['vehicles'][0]['isArmed']))
    send(stale)
    checks.append(('REPLAYED older valid heartbeat rejected', j(f'http://127.0.0.1:{H}/telemetry')['vehicles'][0]['isArmed']))
    send(radio(signer(None, 0)))
    checks.append(('unsigned RADIO_STATUS still accepted (radios cannot sign)',
                   j(f'http://127.0.0.1:{H}/telemetry')['vehicles'][0]['signalStrength'] == 50))
    sig = j(f'http://127.0.0.1:{H}/health')['signing']
    checks.append((f'health reports counts (valid {sig["valid"]}, rejected {sig["rejected"]})', sig['valid'] >= 1 and sig['rejected'] == 3))
finally:
    p.terminate()

# ---------- B. telemetry, signing on but NOT required ----------
U, H = 14802, 8202
p = start_bridge(U, H)
try:
    tx.sendto(hb(signer(None, 0), armed=True), ('127.0.0.1', U)); time.sleep(0.3)
    v = j(f'http://127.0.0.1:{H}/telemetry'); sig = j(f'http://127.0.0.1:{H}/health')['signing']
    checks.append(('unsigned accepted (and counted) when not required', v['connected'] and sig['unsigned'] >= 1))
    tx.sendto(hb(signer(WRONG, 9000), armed=False), ('127.0.0.1', U)); time.sleep(0.3)
    checks.append(('forged still rejected even when not required', j(f'http://127.0.0.1:{H}/telemetry')['vehicles'][0]['isArmed']))
finally:
    p.terminate()

# ---------- C. commands are signed; an aircraft that requires signing obeys only the right key ----------
_run = [0]
def run_cmd(bridge_keyfile_text):
    _run[0] += 1
    VP, U, H = 14803 + 10 * _run[0], 14804 + 10 * _run[0], 8203 + _run[0]
    kf = tempfile.NamedTemporaryFile('w', delete=False, suffix='.key'); kf.write(bridge_keyfile_text); kf.close()
    got = {'cmd': False}; stop = threading.Event()
    def aircraft():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind(('127.0.0.1', VP)); sock.settimeout(0.2)
        got['listening'] = True
        class Out:
            peer = None
            def write(self, d): sock.sendto(d, self.peer)
        out = Out(); m = mavlink.MAVLink(out, srcSystem=1, srcComponent=1)
        m.signing.secret_key, m.signing.sign_outgoing, m.signing.link_id = KEY, True, 0
        m.signing.timestamp = int((time.time() - 1420070400) * 100000)
        m.signing.allow_unsigned_callback = lambda *_: False      # this aircraft REQUIRES signing
        while not stop.is_set():
            try: d, a = sock.recvfrom(2048)
            except socket.timeout: continue
            out.peer = a
            try: msgs = m.parse_buffer(d) or []
            except Exception: msgs = []                            # bad signature
            for msg in msgs:
                if msg.get_type() == 'COMMAND_LONG':
                    got['cmd'] = True; m.command_ack_send(msg.command, mavlink.MAV_RESULT_ACCEPTED)
        sock.close()
    threading.Thread(target=aircraft, daemon=True).start()
    p = subprocess.Popen([sys.executable, 'mavlink_bridge.py', '--udp-port', str(U), '--http-port', str(H),
                          '--signing-key-file', kf.name, '--command-link', f'udpout:127.0.0.1:{VP}'],
                         stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        for _ in range(200):
            try: urllib.request.urlopen(f'http://127.0.0.1:{H}/health', timeout=1); break
            except Exception: time.sleep(0.1)
        req = urllib.request.Request(f'http://127.0.0.1:{H}/command', data=json.dumps({'command': 'rtl'}).encode(),
                                     headers={'Content-Type': 'application/json'})
        try: r = json.loads(urllib.request.urlopen(req, timeout=10).read())
        except urllib.error.HTTPError as e: r = json.loads(e.read())
        assert got.get('listening'), 'fake aircraft never started'
        return got['cmd'], r
    finally:
        p.terminate(); stop.set(); time.sleep(0.4)

obeyed, r = run_cmd('vajron field passphrase')
checks.append(('RTL signed with the right key is obeyed and ACKed', obeyed and r.get('ok') is True))
obeyed, r = run_cmd('attacker guess')
checks.append(('RTL signed with the WRONG key is ignored by the aircraft', not obeyed and r.get('ok') is False))

os.unlink(keyfile.name)
bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'signing verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
