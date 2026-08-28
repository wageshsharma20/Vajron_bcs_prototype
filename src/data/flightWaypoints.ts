/**
 * The 20 survey waypoints for the Sanjay Lake mission.
 *
 * `nx`/`ny` are normalised (0-1) positions inside the map frame, traced from the
 * flight path drawn in assets/video/map-path.mp4 — the line was isolated by
 * colour, walked end to end, and sampled at twenty equal arc-length intervals,
 * so the markers sit on the path rather than being placed by eye. Because they
 * are fractions rather than pixels they stay put at any render size.
 *
 * `lat`/`lng` are the same points georeferenced against a frame centred on
 * Sanjay Lake spanning roughly 2.2 km, so the planner's sidebar and the mission
 * data model have real coordinates to show. The flight itself is simulated, so
 * these are representative rather than surveyed.
 */
export type FlightWaypoint = {
  id: number;
  /** Fraction across the map frame, left to right. */
  nx: number;
  /** Fraction down the map frame, top to bottom. */
  ny: number;
  lat: number;
  lng: number;
  altitude: number;
};

export const FLIGHT_WAYPOINTS: FlightWaypoint[] = [
  { id: 1, nx: 0.1839, ny: 0.4702, lat: 28.618939, lng: 77.301383, altitude: 30 },
  { id: 2, nx: 0.2308, ny: 0.5119, lat: 28.618604, lng: 77.302439, altitude: 40 },
  { id: 3, nx: 0.2812, ny: 0.5179, lat: 28.618557, lng: 77.303575, altitude: 40 },
  { id: 4, nx: 0.3317, ny: 0.5208, lat: 28.618533, lng: 77.304712, altitude: 40 },
  { id: 5, nx: 0.3858, ny: 0.5387, lat: 28.618389, lng: 77.305929, altitude: 40 },
  { id: 6, nx: 0.4363, ny: 0.5417, lat: 28.618365, lng: 77.307066, altitude: 40 },
  { id: 7, nx: 0.4868, ny: 0.5536, lat: 28.618270, lng: 77.308202, altitude: 40 },
  { id: 8, nx: 0.5409, ny: 0.5565, lat: 28.618246, lng: 77.309420, altitude: 40 },
  { id: 9, nx: 0.5913, ny: 0.5387, lat: 28.618389, lng: 77.310557, altitude: 40 },
  { id: 10, nx: 0.6454, ny: 0.5238, lat: 28.618509, lng: 77.311774, altitude: 40 },
  { id: 11, nx: 0.6959, ny: 0.4970, lat: 28.618724, lng: 77.312911, altitude: 40 },
  { id: 12, nx: 0.7464, ny: 0.4762, lat: 28.618891, lng: 77.314047, altitude: 40 },
  { id: 13, nx: 0.8005, ny: 0.4613, lat: 28.619011, lng: 77.315265, altitude: 45 },
  { id: 14, nx: 0.8474, ny: 0.4196, lat: 28.619346, lng: 77.316320, altitude: 45 },
  { id: 15, nx: 0.8870, ny: 0.3304, lat: 28.620063, lng: 77.317213, altitude: 45 },
  { id: 16, nx: 0.9231, ny: 0.2321, lat: 28.620852, lng: 77.318025, altitude: 45 },
  { id: 17, nx: 0.8762, ny: 0.2262, lat: 28.620900, lng: 77.316970, altitude: 45 },
  { id: 18, nx: 0.8257, ny: 0.2440, lat: 28.620757, lng: 77.315833, altitude: 40 },
  { id: 19, nx: 0.7752, ny: 0.2917, lat: 28.620374, lng: 77.314697, altitude: 40 },
  { id: 20, nx: 0.7284, ny: 0.3363, lat: 28.620015, lng: 77.313641, altitude: 30 },
];


/**
 * The geographic window the map frame covers — the same one the waypoints above
 * were derived from. Exported so anything else placed on this frame (a generated
 * survey grid, a live aircraft position) lands in the same coordinate space
 * rather than guessing.
 */
export const MAP_FRAME_BOUNDS = {
  lngMin: 77.297243,
  lngSpan: 0.022513,
  latMax: 28.622718,
  latSpan: 0.008035,
};

/** Projects a coordinate onto the map frame as 0-1 fractions. Values outside the
 * frame are returned as-is rather than clamped, so a caller can tell that a point
 * fell off the map instead of silently seeing it pinned to an edge. */
export function projectToFrame(lat: number, lng: number): { nx: number; ny: number } {
  return {
    nx: (lng - MAP_FRAME_BOUNDS.lngMin) / MAP_FRAME_BOUNDS.lngSpan,
    ny: (MAP_FRAME_BOUNDS.latMax - lat) / MAP_FRAME_BOUNDS.latSpan,
  };
}

/** Aspect ratio of the map frame the waypoint fractions were measured in. Any
 * surface that renders them must use this ratio, or a cover-crop will slide the
 * imagery underneath the markers. */
export const MAP_FRAME_ASPECT = 832 / 336;
