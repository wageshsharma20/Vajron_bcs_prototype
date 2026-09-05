# MAVLink bridge

The GCS is a web page, and a browser cannot open a UDP socket. MAVLink is a
UDP/serial protocol. So the page can never talk to an aircraft directly — this
process sits in between.

```
Pixhawk ──MAVLink──> QGroundControl ──UDP forward──> mavlink_bridge.py ──SSE──> GCS page
```

QGroundControl keeps the vehicle. It owns the link, the parameters and the
commanding. The bridge only listens to the copy QGC forwards and reshapes it for
the display.

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
./start.sh --command-link udpout:127.0.0.1:14550

# ...and additionally ARM, DISARM, TAKEOFF
./start.sh --command-link udpout:127.0.0.1:14550 --allow-arm
```

The first set brings an aircraft down or holds it still; the worst case of an
accidental one is an interrupted survey. The second set spins propellers, and a
stray HTTP request should not be able to do that just because telemetry happened
to be wired up.

`--command-link` takes any pymavlink connection string: `udpout:host:port`,
`tcp:host:port`, or a serial device like `/dev/ttyACM0`. It is a separate link
from the telemetry input, because QGC's forwarding is one-way.

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
