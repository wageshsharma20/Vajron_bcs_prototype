import { FLIGHT_WAYPOINTS } from '../data/flightWaypoints';
import { useTelemetryStore } from '../data/useTelemetryStore';
import { useLinkStore } from '../data/linkStore';
import type { CommandResult } from './commandLink';

/**
 * A simulated aircraft that runs entirely inside the page.
 *
 * It exists so the GCS can be demonstrated with no drone and no bridge -- on
 * the public website, or on a laptop -- while exercising the same screens a
 * real link drives: telemetry, the mission read back from the aircraft,
 * waypoint progress, and commands that are acknowledged or refused.
 *
 * It is never presented as a real aircraft. It runs in its own link mode,
 * 'sim', which the spine labels SIMULATED AIRCRAFT; and the moment a real
 * aircraft appears on a bridge, the real one takes over and this stops for
 * good (see mavlinkLink).
 *
 * Timing: the Live Ops map is a recording of the demo route that runs for
 * 124 s, so the simulated aircraft advances along the route in step with it
 * (about 110 s for the route, after the climb) -- the map, the waypoint
 * counter and the position then always agree. The speed readout shows a
 * realistic survey speed rather than the 20 m/s that implies; this is a
 * demonstration, and a screen that agrees with itself matters more here than
 * exact physics.
 */

export const SIM_DRONE_ID = 'DRONE-01';

const ROUTE_SECONDS = 110;
const CRUISE_ALT = 30;
const CLIMB_RATE = 3; // m/s
const DESCENT_RATE = 2; // m/s
const RTL_SPEED = 15; // m/s, straight line home
const TICK_MS = 100;

type Phase = 'ground' | 'mission' | 'hold' | 'rtl' | 'land';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Cumulative distance along the route, so a fraction of the route maps to a
// point on it by distance rather than by waypoint count.
const ROUTE = FLIGHT_WAYPOINTS.map(w => ({ lat: w.lat, lng: w.lng, alt: w.altitude }));
const CUM: number[] = ROUTE.reduce<number[]>((acc, p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + distance(ROUTE[i - 1], p));
  return acc;
}, []);
const ROUTE_LEN = CUM[CUM.length - 1];
const HOME = { lat: ROUTE[0].lat, lng: ROUTE[0].lng };

function pointAt(f: number) {
  const target = Math.max(0, Math.min(1, f)) * ROUTE_LEN;
  let i = 1;
  while (i < CUM.length - 1 && CUM[i] < target) i++;
  const seg = CUM[i] - CUM[i - 1] || 1;
  const t = (target - CUM[i - 1]) / seg;
  const a = ROUTE[i - 1];
  const b = ROUTE[i];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, next: i };
}

class Simulator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase: Phase = 'ground';
  private f = 0;
  private pos = { ...HOME };
  private alt = 0;
  private heading = 90;
  private battery = 92;
  private signal = 92;
  private sats = 18;
  private nextWp = 1;
  private speed = 0;
  private lastTick = 0;
  private cruiseAlt = CRUISE_ALT;
  private cruiseSpeed = 8;

  get running() {
    return this.timer !== null;
  }

  start() {
    if (this.timer) return;
    // Never over a real link: a real aircraft seen even once outranks this.
    if (useLinkStore.getState().everLive) return;
    useLinkStore.getState().markSim(SIM_DRONE_ID);
    this.publish();
    // Advance by the time that actually passed, not by the nominal tick: a
    // browser throttles timers in a background tab to about once a second,
    // and a fixed 0.1 s step would then fly the aircraft ten times too slowly.
    // Capped at 2 s so a tab that slept for minutes does not teleport it.
    this.lastTick = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(2, Math.max(0, (now - this.lastTick) / 1000));
      this.lastTick = now;
      this.tick(dt);
    }, TICK_MS);
  }

  /** Permanent: called when a real aircraft takes over. */
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** The mission the simulated aircraft "holds", in the bridge's /mission shape. */
  mission() {
    return ROUTE.map((p, seq) => ({ seq, lat: p.lat, lng: p.lng, alt: p.alt }));
  }

  /** Commands answer after a short delay, the way a radio round trip does. */
  sendCommand(command: string, payload?: { altitude?: number; speed?: number }): Promise<CommandResult> {
    return new Promise(resolve => setTimeout(() => resolve(this.apply(command, payload ?? {})), 300));
  }

  private apply(command: string, payload: { altitude?: number; speed?: number }): CommandResult {
    const ok = (): CommandResult => ({ ok: true, result: 'MAV_RESULT_ACCEPTED' });
    const denied = (why: string): CommandResult => ({ ok: false, result: 'MAV_RESULT_DENIED', error: why });
    const airborne = this.phase !== 'ground';

    switch (command) {
      case 'takeoff':
        if (airborne) return denied('The simulated aircraft is already flying.');
        this.phase = 'mission';
        this.f = 0;
        this.nextWp = 1;
        // The mission details chosen on the Plan screen, kept within limits a
        // survey drone would actually fly at.
        this.cruiseAlt = Math.max(10, Math.min(120, payload.altitude ?? CRUISE_ALT));
        this.cruiseSpeed = Math.max(2, Math.min(15, payload.speed ?? 8));
        return ok();
      case 'hold':
      case 'pause':
        if (this.phase !== 'mission') return denied('Only a mission in progress can be paused.');
        this.phase = 'hold';
        return ok();
      case 'resume':
        if (this.phase !== 'hold') return denied('There is no paused mission to resume.');
        this.phase = 'mission';
        return ok();
      case 'rtl':
        if (!airborne) return denied('The simulated aircraft is on the ground.');
        this.phase = 'rtl';
        return ok();
      case 'land':
        if (!airborne) return denied('The simulated aircraft is on the ground.');
        this.phase = 'land';
        return ok();
      default:
        return denied(`The simulator does not support "${command}".`);
    }
  }

  private tick(dt: number) {
    switch (this.phase) {
      case 'mission': {
        this.alt = Math.min(this.cruiseAlt, this.alt + CLIMB_RATE * dt);
        this.f += dt / ROUTE_SECONDS;
        if (this.f >= 1) {
          // A finished mission returns home, as a real autopilot would.
          this.f = 1;
          this.phase = 'rtl';
        }
        const p = pointAt(this.f);
        if (distance(this.pos, p) > 0.5) this.heading = bearing(this.pos, p);
        this.pos = { lat: p.lat, lng: p.lng };
        this.nextWp = p.next;
        this.speed = this.cruiseSpeed + Math.sin(Date.now() / 4000) * 0.4;
        break;
      }
      case 'hold':
        this.speed = 0;
        break;
      case 'rtl': {
        const d = distance(this.pos, HOME);
        if (d < RTL_SPEED * dt) {
          this.pos = { ...HOME };
          this.phase = 'land';
        } else {
          this.heading = bearing(this.pos, HOME);
          const step = (RTL_SPEED * dt) / d;
          this.pos = {
            lat: this.pos.lat + (HOME.lat - this.pos.lat) * step,
            lng: this.pos.lng + (HOME.lng - this.pos.lng) * step,
          };
        }
        this.speed = RTL_SPEED;
        break;
      }
      case 'land':
        this.speed = 0;
        this.alt = Math.max(0, this.alt - DESCENT_RATE * dt);
        if (this.alt === 0) {
          this.phase = 'ground';
          this.f = 0;
          this.nextWp = 1;
        }
        break;
      default:
        this.speed = 0;
    }

    if (this.phase !== 'ground') this.battery = Math.max(15, this.battery - 0.05 * dt);
    // Small, slow variation so the readouts look alive without jumping around.
    this.signal = Math.max(80, Math.min(98, this.signal + (Math.random() - 0.5) * 0.6));
    if (Math.random() < 0.01) this.sats = 17 + Math.floor(Math.random() * 3);
    this.publish();
  }

  private publish() {
    // Belt and braces: if anything has moved the link out of 'sim' -- a real
    // aircraft appearing -- stop rather than write over real telemetry.
    if (useLinkStore.getState().mode !== 'sim') {
      this.stop();
      return;
    }
    const flightMode =
      this.phase === 'ground' ? 'idle'
        : this.phase === 'mission' ? 'auto'
          : this.phase === 'hold' ? 'hold'
            : this.phase === 'rtl' ? 'rtl' : 'land';
    useTelemetryStore.getState().updateTelemetry(SIM_DRONE_ID, {
      lat: this.pos.lat,
      lng: this.pos.lng,
      altitude: Math.round(this.alt * 10) / 10,
      heading: Math.round(this.heading),
      groundSpeed: Math.round(this.speed * 10) / 10,
      batteryPercent: Math.round(this.battery),
      batteryVoltage: Math.round((19.8 + (this.battery / 100) * 5.4) * 10) / 10,
      signalStrength: Math.round(this.signal),
      linkRssi: -40 - Math.round((100 - this.signal) / 2),
      gpsFixType: '3d',
      gpsSatsVisible: this.sats,
      flightMode,
      isArmed: this.phase !== 'ground',
      distanceToHome: Math.round(distance(this.pos, HOME)),
      missionSeq: this.phase === 'ground' ? 0 : this.nextWp,
      missionTotal: ROUTE.length,
    });
  }
}

export const simulator = new Simulator();
