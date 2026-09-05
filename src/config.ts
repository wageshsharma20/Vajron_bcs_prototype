/**
 * Where the GCS finds its live telemetry.
 *
 * The page cannot speak MAVLink — browsers have no UDP — so it reads a bridge
 * process that does. See bridge/mavlink_bridge.py for the other half.
 *
 * Default is localhost because the bridge is meant to run on the same Pi that
 * shows the display. Override without rebuilding by adding ?bridge=... to the
 * address, which is how you point a laptop at a Pi in the field:
 *
 *     http://raspberrypi.local:8080/?bridge=http://raspberrypi.local:8082
 */
const DEFAULT_BRIDGE = 'http://localhost:8082';

function resolveBridgeUrl(): string {
  if (typeof window === 'undefined' || !window.location) return DEFAULT_BRIDGE;
  try {
    const override = new URLSearchParams(window.location.search).get('bridge');
    if (override) return override.replace(/\/+$/, '');
  } catch {
    // A malformed query string must not stop the GCS from starting.
  }
  return DEFAULT_BRIDGE;
}

export const BRIDGE_URL = resolveBridgeUrl();
export const TELEMETRY_STREAM = `${BRIDGE_URL}/telemetry/stream`;

/**
 * How long a live link may go quiet before it is called lost.
 *
 * Generous next to a 1 Hz heartbeat, because declaring a link dead during a
 * normal radio stutter is its own kind of dangerous — the operator stops
 * trusting the indicator and then ignores it when it matters.
 */
export const LINK_TIMEOUT_MS = 3000;
