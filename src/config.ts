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
  // Served over HTTPS (Caddy on the Pi, port 8443): the bridge sits behind the
  // same origin at /bridge. It cannot be reached at http://...:8082 from here --
  // browsers block plain-HTTP requests from an HTTPS page as mixed content.
  // On a host with no bridge (the public Vercel build) that path simply 404s;
  // EventSource does not retry a non-200 response, so the page stays in demo.
  if (window.location.protocol === 'https:') {
    return `${window.location.origin}/bridge`;
  }
  return DEFAULT_BRIDGE;
}

/**
 * Shared secret for commanding, if the bridge was started with one.
 *
 * Telemetry is deliberately open — reading a feed harms nothing — but the
 * command endpoint flies an aircraft, and the bridge's --command-link /
 * --allow-arm flags decide which commands exist, not who may invoke them.
 * Supplied the same way as the bridge address:
 *
 *     ?bridge=http://raspberrypi.local:8082&token=...
 */
function resolveToken(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    return new URLSearchParams(window.location.search).get('token');
  } catch {
    return null;
  }
}

/**
 * The in-page simulated aircraft (services/simulator).
 *
 * On by default only on the public website, which has no bridge and no drone
 * to show. Anywhere else it must be asked for with ?sim=1, so a field station
 * never starts flying a pretend aircraft just because its bridge is down.
 * ?sim=0 turns it off everywhere.
 */
function resolveSim(): { enabled: boolean; bridgeDisabled: boolean } {
  if (typeof window === 'undefined' || !window.location) return { enabled: false, bridgeDisabled: false };
  let flag: string | null = null;
  let bridgeOverride = false;
  try {
    const q = new URLSearchParams(window.location.search);
    flag = q.get('sim');
    bridgeOverride = q.has('bridge');
  } catch {
    // ignore a malformed query string
  }
  const publicSite = window.location.hostname.endsWith('.vercel.app');
  return {
    enabled: flag === '1' || (publicSite && flag !== '0'),
    // The public site has no bridge: do not even try, or the console fills
    // with failed requests. ?bridge=... still overrides.
    bridgeDisabled: publicSite && !bridgeOverride,
  };
}

const SIM = resolveSim();
export const SIM_ENABLED = SIM.enabled;
export const BRIDGE_DISABLED = SIM.bridgeDisabled;

export const BRIDGE_URL = resolveBridgeUrl();
export const COMMAND_TOKEN = resolveToken();
export const TELEMETRY_STREAM = `${BRIDGE_URL}/telemetry/stream`;

/**
 * How long a live link may go quiet before it is called lost.
 *
 * Generous next to a 1 Hz heartbeat, because declaring a link dead during a
 * normal radio stutter is its own kind of dangerous — the operator stops
 * trusting the indicator and then ignores it when it matters.
 */
export const LINK_TIMEOUT_MS = 3000;
