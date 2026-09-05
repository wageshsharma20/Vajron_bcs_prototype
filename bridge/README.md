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
python3 mavlink_bridge.py
```

Defaults to UDP 14551 in, HTTP 8082 out. Python 3 standard library only — no
`pip install`, which is what lets it run on a field Pi with no internet.

| Endpoint | What it gives you |
|---|---|
| `GET /telemetry` | one JSON snapshot |
| `GET /telemetry/stream` | Server-Sent Events at 10 Hz |
| `GET /health` | link state and packet count |

## Testing without an aircraft

```bash
python3 fake_drone.py
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

Not implemented, on purpose.

Sending `COMMAND_LONG` requires a correct CRC, and an arm/takeoff/RTL path built
on a CRC seed that has not been verified against real hardware is not something
to guess at. **Use QGroundControl to command the aircraft.** If commanding from
the GCS is wanted later, the right move is `pip install pymavlink` and using its
generated message definitions rather than extending this hand-rolled encoder.

## What is not in MAVLink

`jetsonCpuTemp`, `jetsonGpuTemp` and `inferenceFps` come from the companion
computer, not the flight controller. The bridge leaves them alone rather than
inventing values.
