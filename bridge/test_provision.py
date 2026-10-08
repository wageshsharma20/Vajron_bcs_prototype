#!/usr/bin/env python3
"""provision_signing.py against three simulated autopilots."""
import hashlib, os, socket, subprocess, sys, tempfile, threading, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from pymavlink.dialects.v20 import ardupilotmega as mavlink

def aircraft(port, behaviour, stop):
    """behaviour: 'full' signs telemetry after keying; 'cmd-only' enforces on
    commands but sends telemetry unsigned; 'ignores' never accepts a key."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind(('127.0.0.1', port)); sock.settimeout(0.1)
    class Out:
        peer = None
        def write(self, d):
            if self.peer: sock.sendto(d, self.peer)
    out = Out(); m = mavlink.MAVLink(out, srcSystem=1, srcComponent=1)
    keyed = False; last = 0
    while not stop.is_set():
        if time.time() - last > 0.2:
            m.signing.sign_outgoing = keyed and behaviour == 'full'
            m.heartbeat_send(2, 3, 81, 3, 4); last = time.time()
        try: d, a = sock.recvfrom(2048)
        except socket.timeout: continue
        out.peer = a
        try: msgs = m.parse_buffer(d) or []
        except Exception: msgs = []                       # bad/unsigned while enforcing
        for msg in msgs:
            t = msg.get_type()
            if t == 'SETUP_SIGNING' and behaviour != 'ignores':
                m.signing.secret_key = bytes(msg.secret_key); m.signing.link_id = 0
                m.signing.timestamp = msg.initial_timestamp
                m.signing.allow_unsigned_callback = lambda *_: False
                keyed = True
            elif t == 'COMMAND_LONG':
                m.signing.sign_outgoing = keyed and behaviour == 'full'
                m.command_ack_send(msg.command, mavlink.MAV_RESULT_ACCEPTED)
    sock.close()

kf = tempfile.NamedTemporaryFile('w', delete=False); kf.write('vajron field passphrase'); kf.close()
checks = []
for i, (behaviour, want_rc, want_text) in enumerate([
        ('full',     0, 'Signing works both ways'),
        ('cmd-only', 0, 'do\nNOT use --require-signed'),
        ('ignores',  1, 'Signing is not working')]):
    port = 14901 + i; stop = threading.Event()
    threading.Thread(target=aircraft, args=(port, behaviour, stop), daemon=True).start(); time.sleep(0.3)
    r = subprocess.run([sys.executable, 'provision_signing.py', '--device', f'udpout:127.0.0.1:{port}',
                        '--key-file', kf.name, '--yes'], capture_output=True, text=True, timeout=60)
    stop.set(); time.sleep(0.3)
    out = r.stdout + r.stderr
    ok = r.returncode == want_rc and want_text.replace('\n', ' ') in out.replace('\n', ' ')
    checks.append((f'{behaviour:9} aircraft -> exit {r.returncode}, "{want_text.splitlines()[0]}..."', ok))
    if not ok: print(out)
os.unlink(kf.name)
bad = 0
for label, ok in checks:
    bad += not ok; print(f'  [{"PASS" if ok else "FAIL"}] {label}')
print('\nRESULT:', 'provisioning verified' if not bad else f'{bad} failed')
sys.exit(1 if bad else 0)
