# MAVLink bridge

The GCS is a web page, and a browser cannot open a UDP socket. MAVLink is a
UDP/serial protocol. So the page can never talk to an aircraft directly — this
process sits in between.

```
On the Pi, mavlink-router owns the link to the aircraft and fans it out, so
the DDA GCS and QGroundControl are independent peers -- either can be closed
without affecting the other:

```
Pixhawk --UART--> mavlink-router --UDP 14551--> bridge --SSE--> GCS page
                        ^ <--------UDP 14560--- bridge   (commands; ACKs return)
                        +--------TCP 5760-----> QGroundControl
```

Config: `deploy/pi/mavlink-router.conf`. Connect QGC with a **TCP** comm link to
the Pi, port 5760. Do **not** also turn on QGC's MAVLink forwarding to the
bridge: the router already feeds it, and forwarding would deliver every packet
twice.

The bridge sends as MAVLink system **254** (`--gcs-system`). QGC is 255. The
router routes replies by target system, so each station gets its own ACKs --
which only works because they no longer share an identity.

Without the router (e.g. on a Mac with QGC running), QGC's forwarding to UDP
14551 still works as before.

**The bridge cannot fly the aircraft.** It never transmits — it only reads. That
is deliberate, not unfinished: see "Commanding" below.

## Running it

```bash
./start.sh
```

Defaults to UDP 14551 in, HTTP 8082 out.

`start.sh` picks an interpreter that can actually load pymavlink. On this Mac
the Homebrew pythons cannot: they link against a newer libexpat than macOS
ships, so `import pymavlink` fails on them and commanding would quietly be
unavailable. Apple's `/usr/bin/python3` is fine. `mavlink_bridge.py` also adds
its own `vendor/` to the path, so neither `PYTHONPATH` nor a virtualenv is
needed. Python 3 standard library only — no
`pip install`, which is what lets it run on a field Pi with no internet.

| Endpoint | What it gives you |
|---|---|
| `GET /telemetry` | one JSON snapshot |
| `GET /telemetry/stream` | Server-Sent Events at 10 Hz |
| `GET /health` | link state and packet count |

## Testing without an aircraft

```bash
./run-fake-drone.sh
```

Flies a circuit over the park at 5 Hz with a draining battery. The GCS should
switch to `LIVE TELEMETRY` within a second.

`test_bridge.py` is the parser test: it feeds known frames and asserts every
decoded field, so a wrong byte offset fails loudly instead of showing a
plausible wrong number.

## Why 14551 and not 14550

QGroundControl binds UDP 14550 itself to listen for vehicles. A bridge on 14550
dies with `EADDRINUSE` the moment QGC is open — which is always, since QGC is
what forwards the stream here.

## Why SSE and not WebSockets

Telemetry only travels one way. `EventSource` already does
reconnect-with-backoff correctly, which is the part hand-rolled socket logic
usually gets wrong, and SSE needs no handshake, no frame masking and no
dependency.

## Why the CRC is not checked

Validating MAVLink's CRC means shipping the `CRC_EXTRA` seed for every message
id. One wrong seed silently drops that message type forever — a worse failure
than the corruption it would catch on a local UDP link that already has its own
checksum.

## Commanding

Off by default. Two separate opt-ins, because the commands are not equally
dangerous:

```bash
# RTL, LAND, PAUSE/CONTINUE only
./start.sh --command-link udpout:127.0.0.1:14560   # behind the router

# ...and additionally ARM, DISARM, TAKEOFF
./start.sh --command-link udpout:127.0.0.1:14560 --allow-arm  # behind the router
```

The first set brings an aircraft down or holds it still; the worst case of an
accidental one is an interrupted survey. The second set spins propellers, and a
stray HTTP request should not be able to do that just because telemetry happened
to be wired up.

`--command-link` takes any pymavlink connection string: `udpout:host:port`,
`tcp:host:port`, or a serial device like `/dev/ttyACM0`. It is a separate link
from the telemetry input. Behind the router it is the router's command
endpoint, `udpout:127.0.0.1:14560`.

Commands are sent with **pymavlink**, not the hand-rolled encoder used for
receiving. A `COMMAND_LONG` needs a correct per-message CRC seed; pymavlink is
the reference implementation that generates them, and an arm or takeoff built on
a guessed seed is either silently ignored or not the command you meant.

```bash
pip install pymavlink        # or: pip install -r requirements.txt
```

The bridge reports the autopilot's own verdict rather than assuming success:

```json
{"ok": true, "command": "rtl", "result": "MAV_RESULT_ACCEPTED"}
```

A refused command comes back `ok: false` with the real `MAV_RESULT`, and the GCS
shows it. A rejected RTL displayed as accepted is how an operator ends up
believing a drone is coming home while it carries on.

### Who may command

The `--command-link` / `--allow-arm` flags decide which commands *exist*, not
who may invoke them. The HTTP side binds `0.0.0.0` so a laptop on the field
network can read the feed, which means without a token anything that can reach
the port can fly the aircraft.

```bash
./start.sh --command-link udpout:127.0.0.1:14552 --allow-arm --command-token SECRET
```

The page sends it as `?token=SECRET` alongside `?bridge=`:

```
http://raspberrypi.local:8080/?bridge=http://raspberrypi.local:8082&token=SECRET
```

Telemetry stays open — reading a feed harms nothing. Only `POST /command` is
checked, with `hmac.compare_digest`. Without `--command-token` the bridge still
starts (it is routinely run against a simulator on localhost) but prints a
warning. **Set a token before this goes near real hardware.**

`--http-host 127.0.0.1` additionally confines it to the device.

`test_commands.py` exercises the whole path against a fake autopilot that
decodes `COMMAND_LONG` and answers `COMMAND_ACK` — encoding, targeting,
acknowledgement and both safety gates. Only the radio is missing.

### Still untested against real hardware

Every check above runs against a simulated autopilot. Before trusting this with
a real aircraft, fly it in SITL first, then bench-test with props removed.

## What is not in MAVLink

`jetsonCpuTemp`, `jetsonGpuTemp` and `inferenceFps` come from the companion
computer, not the flight controller. The bridge leaves them alone rather than
inventing values.


## MAVLink signing

Signing **authenticates** packets -- a 6-byte SHA-256 tag made with a key both
ends share -- so nobody without the key can inject a command or forge
telemetry, and recorded packets cannot be replayed. It does **not** encrypt:
anyone listening can still read the telemetry. Confidentiality comes from the
radio or a tunnel, not from this.

The key file holds either 64 hex characters (the raw key) or a passphrase, in
which case the key is its SHA-256. Mission Planner derives keys the same way.
**Do not assume QGroundControl does** -- if QGC stops being able to command the
aircraft after you enable signing, its key differs; the provisioning tool's
report below is the source of truth.

### 1. The bridge

```bash
./start.sh --signing-key-file /etc/vajron-gcs/mavlink-signing.key ...
```

Commands go out signed. Incoming telemetry is verified: a **forged** or
**replayed** frame is always dropped; an **unsigned** one is accepted and
counted, until you add `--require-signed`. `/health` shows the counts.

Commands are MAVLink 2. pymavlink defaults to MAVLink 1 unless `MAVLINK20` is
set before import, and MAVLink 1 cannot be signed -- `setup_signing()` then
succeeds silently and nothing is signed. The bridge sets it.

### 2. The aircraft -- once, over USB, PROPELLERS OFF

```bash
python3 provision_signing.py --device /dev/ttyACM0 --key-file /etc/vajron-gcs/mavlink-signing.key
```

On the Pi, mavlink-router holds the serial port; stop it first
(`sudo systemctl stop vajron-router`) and start it again afterwards.

The tool installs the key with `SETUP_SIGNING` and then **proves** it rather
than assuming:

- a correctly signed command is obeyed, **and an unsigned one is refused** --
  the second check is the real one, since an aircraft with no key obeys signed
  commands too;
- whether the aircraft now signs its own telemetry.

### 3. `--require-signed` -- only if step 2 said the aircraft signs telemetry

Otherwise every frame is dropped and the display goes blank. Some autopilots
need a parameter to sign or enforce at all (PX4: `MAV_SIGN_CFG`).

`--disable` on the provisioning tool sends the all-zero key the signing spec
uses to turn signing off. **Keep the passphrase**: an aircraft enforcing
signing ignores every ground station without it.

`test_signing.py` covers forged, unsigned and replayed frames and signed
commands against an aircraft that enforces signing; `test_provision.py` covers
an aircraft that signs everything, one that signs only commands, and one that
ignores the key.
