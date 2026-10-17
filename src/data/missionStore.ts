import { create } from 'zustand';
import { FLIGHT_WAYPOINTS } from './flightWaypoints';

/**
 * The mission being PLANNED on this station.
 *
 * Kept separate from the mission the aircraft actually holds (read back with
 * useAircraftMission): until the plan is uploaded and the aircraft confirms
 * it, the two can differ, and the interface must never let the drawn plan be
 * mistaken for what will be flown.
 */
export type PlanWaypoint = { id: string; lat: number; lng: number; alt: number };

let counter = 0;
const nextId = () => `wp${Date.now().toString(36)}${(counter++).toString(36)}`;

/** A short fingerprint of a route, to tell whether the plan matches the upload. */
export function routeKey(wps: { lat: number; lng: number; alt: number }[]) {
  return wps.map(w => `${w.lat.toFixed(6)},${w.lng.toFixed(6)},${Math.round(w.alt)}`).join('|');
}

interface MissionStore {
  waypoints: PlanWaypoint[];
  selectedId: string | null;
  defaultAlt: number;
  speed: number;
  /** Route key of the last plan the aircraft accepted, or null. */
  uploadedKey: string | null;

  add: (lat: number, lng: number) => void;
  move: (id: string, lat: number, lng: number) => void;
  setAlt: (id: string, alt: number) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  replace: (wps: { lat: number; lng: number; alt: number }[]) => void;
  clear: () => void;
  setDefaultAlt: (alt: number) => void;
  setSpeed: (speed: number) => void;
  markUploaded: () => void;
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  waypoints: FLIGHT_WAYPOINTS.map(w => ({ id: nextId(), lat: w.lat, lng: w.lng, alt: w.altitude })),
  selectedId: null,
  defaultAlt: 40,
  speed: 6,
  uploadedKey: null,

  add: (lat, lng) => {
    const id = nextId();
    set(s => ({ waypoints: [...s.waypoints, { id, lat, lng, alt: s.defaultAlt }], selectedId: id }));
  },
  move: (id, lat, lng) =>
    set(s => ({ waypoints: s.waypoints.map(w => (w.id === id ? { ...w, lat, lng } : w)) })),
  setAlt: (id, alt) =>
    set(s => ({ waypoints: s.waypoints.map(w => (w.id === id ? { ...w, alt } : w)) })),
  remove: id =>
    set(s => ({
      waypoints: s.waypoints.filter(w => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  select: id => set({ selectedId: id }),
  replace: wps => set({ waypoints: wps.map(w => ({ id: nextId(), ...w })), selectedId: null }),
  clear: () => set({ waypoints: [], selectedId: null }),
  setDefaultAlt: alt => set({ defaultAlt: alt }),
  setSpeed: speed => set({ speed }),
  markUploaded: () => set({ uploadedKey: routeKey(get().waypoints) }),
}));

/** Straight-line route length in metres. */
export function routeLength(wps: { lat: number; lng: number }[]) {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 1; i < wps.length; i++) {
    const a = wps[i - 1], b = wps[i];
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(h));
  }
  return total;
}
