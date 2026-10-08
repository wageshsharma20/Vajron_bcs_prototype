#!/usr/bin/env python3
"""Install a MAVLink 2 signing key on the flight controller, then prove it took.

Run once per aircraft, over USB, with PROPELLERS REMOVED:

    python3 provision_signing.py --device /dev/ttyACM0 --key-file /etc/vajron-gcs/mavlink-signing.key

It sends the standard SETUP_SIGNING message, then checks two things rather
than assuming:
  1. the aircraft obeys a command signed with the new key, and
  2. whether the aircraft now SIGNS ITS OWN telemetry -- which decides whether
     the bridge can safely be run with --require-signed.

Keep the passphrase. An aircraft that enforces signing ignores commands from
any ground station without it. --disable sends an all-zero key, which the
MAVLink signing spec uses to turn signing off.
"""
import argparse, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
os.environ.setdefault('MAVLINK20', '1')   # signing does not exist in MAVLink 1
from pymavlink import mavutil
from mavlink_bridge import load_signing_key

EPOCH_2015 = 1420070400

def stamp():
    return int((time.time() - EPOCH_2015) * 100000)   # 10 us units since 2015

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', required=True, help='/dev/ttyACM0, tcp:host:port, udpout:host:port')
    ap.add_argument('--baud', type=int, default=57600)
    ap.add_argument('--key-file', help='same file the bridge uses (--signing-key-file)')
    ap.add_argument('--disable', action='store_true', help='send an all-zero key to turn signing off')
    ap.add_argument('--target-system', type=int, default=1)
    ap.add_argument('--yes', action='store_true', help='skip the propellers-off confirmation')
    a = ap.parse_args()
    if not a.disable and not a.key_file:
        ap.error('--key-file is required (or --disable)')
    key = bytes(32) if a.disable else load_signing_key(a.key_file)

    conn = mavutil.mavlink_connection(a.device, baud=a.baud, source_system=254, source_component=190)
    print(f'Connecting to {a.device} ...')
    hb = None
    deadline = time.time() + 15
    while hb is None and time.time() < deadline:
        # Announce ourselves: over UDP the aircraft cannot answer until it has
        # heard from us.
        conn.mav.heartbeat_send(6, 8, 0, 0, 4)
        hb = conn.recv_match(type='HEARTBEAT', blocking=True, timeout=1)
        if hb is not None and hb.get_srcSystem() != a.target_system:
            hb = None
    if hb is None:
        sys.exit(f'No heartbeat from system {a.target_system}. Is the flight controller connected and powered?')
    print(f'Found system {hb.get_srcSystem()} (autopilot type {hb.autopilot}).')

    if not a.yes:
        print('\nThis changes how the aircraft accepts commands. PROPELLERS MUST BE OFF.')
        if input("Type 'yes' to continue: ").strip().lower() != 'yes':
            sys.exit('Cancelled.')

    conn.mav.setup_signing_send(a.target_system, 1, key, stamp())
    print('SETUP_SIGNING sent.' + ('  (all-zero key: signing OFF)' if a.disable else ''))
    time.sleep(1.0)
    if a.disable:
        print('Done. Remove --signing-key-file / --require-signed from the bridge as well.')
        return

    def probe(signed):
        """Send a harmless request (autopilot version, answered with an ACK),
        signed or not. Returns True if the aircraft acted on it."""
        conn.mav.signing.sign_outgoing = signed
        while conn.recv_match(type='COMMAND_ACK', blocking=False) is not None:
            pass                                   # drop stale ACKs first
        for _ in range(3):
            conn.mav.command_long_send(a.target_system, 1, mavutil.mavlink.MAV_CMD_REQUEST_MESSAGE, 0,
                                       mavutil.mavlink.MAVLINK_MSG_ID_AUTOPILOT_VERSION, 0, 0, 0, 0, 0, 0)
            ack = conn.recv_match(type='COMMAND_ACK', blocking=True, timeout=2)
            if ack is not None and ack.command == mavutil.mavlink.MAV_CMD_REQUEST_MESSAGE:
                return ack.result == mavutil.mavlink.MAV_RESULT_ACCEPTED
        return False

    conn.setup_signing(key, sign_outgoing=True, allow_unsigned_callback=lambda *_: True)

    # 1. A command signed with the new key must be obeyed...
    signed_ok = probe(signed=True)
    # 2. ...and an UNSIGNED one must be refused. This is the real proof: an
    #    aircraft with no key at all obeys signed commands too (it simply does
    #    not check them), so step 1 alone would report success on an aircraft
    #    that ignored SETUP_SIGNING entirely.
    unsigned_obeyed = probe(signed=False)
    conn.mav.signing.sign_outgoing = True
    print(f"  signed command obeyed:        {'YES' if signed_ok else 'NO'}")
    print(f"  UNSIGNED command refused:     {'YES' if not unsigned_obeyed else 'NO  <- signing is not enforced'}")

    # 3. Does it sign its own telemetry?
    signed = total = 0
    end = time.time() + 4
    while time.time() < end:
        m = conn.recv_match(type='HEARTBEAT', blocking=True, timeout=1)
        if m is not None and m.get_srcSystem() == a.target_system:
            total += 1
            signed += bool(getattr(m, '_signed', False))
    signs = total > 0 and signed == total
    print(f"  aircraft signs telemetry:     {'YES' if signs else 'NO'}  ({signed}/{total} heartbeats signed)")
    print()

    if not signed_ok:
        sys.exit('The aircraft did not obey a correctly signed command. Do not rely on signing.')
    if unsigned_obeyed:
        sys.exit('Signing is not working: the aircraft still obeys UNSIGNED commands.\n'
                 'Either the key was not stored, or this autopilot does not enforce\n'
                 'signing on this link (some accept unsigned over USB; PX4 needs\n'
                 'MAV_SIGN_CFG). Check over the telemetry link before relying on it.')
    if signs:
        print('Signing works both ways. The bridge can run with --require-signed.')
    else:
        print('Commands are protected. Telemetry is NOT signed by this aircraft, so do')
        print('NOT use --require-signed: it would blank the display.')


if __name__ == '__main__':
    main()
