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

/**
 * The operator's connection choice, made in the Connect panel and remembered
 * in this browser. Precedence: address-bar parameters, then this, then the
 * defaults below.
 */
export type ConnectionChoice = { source: 'sim' | 'bridge'; bridgeUrl?: string; token?: string; cameraUrl?: string };
const STORE_KEY = 'gcs.connection';

export function loadConnection(): ConnectionChoice | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    return raw ? (JSON.parse(raw) as ConnectionChoice) : null;
  } catch {
    return null; // private window, blocked storage, corrupt value: use defaults
  }
}

/** Saves the choice and reloads, so every part of the station starts on it. */
export function saveConnection(choice: ConnectionChoice) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(choice));
  } catch {
    // storage blocked: fall through to the reload with query parameters
  }
  const q = new URLSearchParams();
  if (choice.source === 'sim') q.set('sim', '1');
  else {
    q.set('sim', '0');
    if (choice.bridgeUrl) q.set('bridge', choice.bridgeUrl);
    // Never the token: the address bar ends up in history, logs and
    // screenshots. It is read back from storage on the reload.
  }
  window.location.search = q.toString();
}

const SAVED = loadConnection();

function resolveBridgeUrl(): string {
  if (typeof window === 'undefined' || !window.location) return DEFAULT_BRIDGE;
  try {
    const override = new URLSearchParams(window.location.search).get('bridge');
    if (override) return override.replace(/\/+$/, '');
  } catch {
    // A malformed query string must not stop the GCS from starting.
  }
  if (SAVED?.source === 'bridge' && SAVED.bridgeUrl) return SAVED.bridgeUrl.replace(/\/+$/, '');
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
    const q = new URLSearchParams(window.location.search).get('token');
    if (q) return q;
  } catch {
    // ignore
  }
  return SAVED?.source === 'bridge' && SAVED.token ? SAVED.token : null;
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
  const savedBridge = SAVED?.source === 'bridge';
  const savedSim = SAVED?.source === 'sim';
  const enabled = flag === '1' || (flag !== '0' && (savedSim || (publicSite && !savedBridge)));
  return {
    enabled,
    // The public site has no bridge of its own: only reach out when the
    // operator has pointed it at one, or the console fills with failures.
    bridgeDisabled: publicSite && !bridgeOverride && !savedBridge,
  };
}

const SIM = resolveSim();
export const SIM_ENABLED = SIM.enabled;
export const BRIDGE_DISABLED = SIM.bridgeDisabled;

export const BRIDGE_URL = resolveBridgeUrl();
export const COMMAND_TOKEN = resolveToken();

/**
 * The camera's WebRTC (WHEP) address, e.g. http://localhost:8889/cam/whep from
 * MediaMTX. With none set, a real aircraft shows no picture rather than
 * recorded footage that could be mistaken for its camera.
 */
function resolveCamera(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const q = new URLSearchParams(window.location.search).get('camera');
    if (q) return q;
  } catch {
    // ignore
  }
  return SAVED?.cameraUrl || null;
}
export const CAMERA_URL = resolveCamera();
export const TELEMETRY_STREAM = `${BRIDGE_URL}/telemetry/stream`;

/**
 * How long a live link may go quiet before it is called lost.
 *
 * Generous next to a 1 Hz heartbeat, because declaring a link dead during a
 * normal radio stutter is its own kind of dangerous — the operator stops
 * trusting the indicator and then ignores it when it matters.
 */
export const LINK_TIMEOUT_MS = 3000;


/**
 * Satellite imagery for the maps.
 *
 * Esri World Imagery by default: high-resolution over Delhi and no key needed
 * to evaluate. For a commercial launch the provider's terms apply (Esri needs
 * an ArcGIS account for production use) -- swap the URL for a licensed
 * provider (MapTiler, Mapbox, Esri with a key) here, in one place.
 *
 * The field Pi has no internet, so tiles may be unavailable there: the map
 * keeps working (positions, route, aircraft) on a plain grid and says so.
 */
export const MAP_TILES = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
};
