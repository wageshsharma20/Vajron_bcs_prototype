import { TELEMETRY_STREAM, LINK_TIMEOUT_MS } from '../config';
import { useLinkStore } from '../data/linkStore';
import { useTelemetryStore } from '../data/useTelemetryStore';
import { telemetryService } from './telemetryService';
import { TelemetryFrame } from '../data/types';

/**
 * Reads live telemetry from the MAVLink bridge and feeds it into the store.
 *
 * Server-Sent Events rather than a socket: the traffic is one-directional, and
 * EventSource already does reconnection-with-backoff correctly, which is the
 * part hand-rolled reconnect logic usually gets wrong.
 *
 * Nothing here commands the aircraft. The bridge is receive-only and so is
 * this; QGroundControl remains the thing that flies the drone.
 */

/** Only the fields the bridge can actually derive from MAVLink. */
const LIVE_FIELDS: (keyof TelemetryFrame)[] = [
  'lat', 'lng', 'altitude', 'heading', 'groundSpeed', 'batteryPercent',
  'batteryVoltage', 'signalStrength', 'linkRssi', 'gpsFixType',
  'gpsSatsVisible', 'flightMode', 'isArmed', 'distanceToHome', 'timestamp',
];

let source: EventSource | null = null;
let watchdog: any = null;

function applyFrame(raw: any) {
  const frame: Partial<TelemetryFrame> = {};
  for (const key of LIVE_FIELDS) {
    if (raw[key] !== undefined) (frame as any)[key] = raw[key];
  }
  // Not carried over: jetsonCpuTemp, jetsonGpuTemp and inferenceFps. Those come
  // from the companion computer, not the flight controller, so MAVLink has
  // nothing to say about them and inventing values would be worse than leaving
  // the seeded ones visibly static.
  useTelemetryStore.getState().updateTelemetry(raw.droneId, frame);
}

export function startMavlinkLink() {
  if (typeof EventSource === 'undefined') {
    console.warn('[mavlink] no EventSource in this runtime — staying in demo mode');
    return () => {};
  }
  if (source) return stopMavlinkLink;

  const link = useLinkStore.getState();
  console.log(`[mavlink] connecting to ${TELEMETRY_STREAM}`);
  source = new EventSource(TELEMETRY_STREAM);

  source.onopen = () => {
    console.log('[mavlink] stream open');
    useLinkStore.getState().markTransport(true);
  };

  source.onmessage = event => {
    let payload: any;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return; // a truncated frame is not worth tearing the link down for
    }
    const store = useLinkStore.getState();
    store.markTransport(true);

    const vehicle = payload.connected ? payload.vehicles?.[0] : null;
    if (!vehicle) {
      // Bridge is up but no aircraft is talking to it.
      store.markSilent();
      return;
    }

    // The moment a real vehicle appears, the canned replay has to stop. Two
    // sources writing the same drone id would interleave real and fictional
    // frames into one indistinguishable stream.
    if (store.mode !== 'live') {
      telemetryService.stopMockReplay();
      console.log(`[mavlink] live vehicle sysid ${vehicle.sysid} — demo replay stopped`);
    }
    store.markLive(payload.packets ?? 0);
    applyFrame(vehicle);
  };

  source.onerror = () => {
    // EventSource reconnects on its own; do not close it here or that stops.
    useLinkStore.getState().markTransport(false);
  };

  watchdog = setInterval(() => {
    const s = useLinkStore.getState();
    if (s.mode === 'live' && s.lastFrameAt && Date.now() - s.lastFrameAt > LINK_TIMEOUT_MS) {
      s.markSilent();
    }
  }, 1000);

  void link;
  return stopMavlinkLink;
}

export function stopMavlinkLink() {
  if (source) { source.close(); source = null; }
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
  useLinkStore.getState().markTransport(false);
}
