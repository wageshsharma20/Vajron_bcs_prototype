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
 * It flies whatever mission is uploaded to it, waypoint by waypoint, at the
 * chosen speed and each waypoint's altitude, on the real map -- so what the
 * screens show is what it does.
 */

export const SIM_DRONE_ID = 'DRONE-01';

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

type Wp = { lat: number; lng: number; alt: number };
const DEFAULT_ROUTE: Wp[] = FLIGHT_WAYPOINTS.map(w => ({ lat: w.lat, lng: w.lng, alt: w.altitude }));

class Simulator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase: Phase = 'ground';
  private route: Wp[] = DEFAULT_ROUTE;
  private home = { lat: DEFAULT_ROUTE[0].lat, lng: DEFAULT_ROUTE[0].lng };
  private pos = { ...this.home };
  private alt = 0;
  private heading = 90;
  private battery = 92;
  private signal = 92;
  private sats = 18;
  private nextWp = 0;   // index into route of the current target
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

  /** The mission the simulated aircraft holds, in the bridge's /mission shape. */
  mission() {
    // Item numbers start at 1, as on an autopilot where item 0 is home, so
    // MISSION_CURRENT maps onto these the same way for both.
    return this.route.map((p, i) => ({ seq: i + 1, lat: p.lat, lng: p.lng, alt: p.alt }));
  }

  getHome() {
    return { ...this.home };
  }

  /**
   * Accept a new mission, as an autopilot would over the mission protocol.
   * Refused while airborne: changing the route under a flying aircraft is a
   * decision for a real operator, not something a demo should model casually.
   */
  uploadMission(wps: Wp[]): Promise<CommandResult> {
    return new Promise(resolve => setTimeout(() => {
      if (this.phase !== 'ground') {
        resolve({ ok: false, result: 'MAV_MISSION_DENIED', error: 'Land before uploading a new mission.' });
        return;
      }
      if (wps.length === 0) {
        resolve({ ok: false, result: 'MAV_MISSION_INVALID', error: 'The mission has no waypoints.' });
        return;
      }
      this.route = wps.map(w => ({ ...w }));
      // A simulated aircraft can stand anywhere: if the new mission is far
      // from where it is, place it at the mission's start, as if it had been
      // carried there before the flight.
      if (distance(this.pos, wps[0]) > 3000) {
        this.home = { lat: wps[0].lat, lng: wps[0].lng };
        this.pos = { ...this.home };
      }
      this.nextWp = 0;
      this.publish();
      resolve({ ok: true, result: 'MAV_MISSION_ACCEPTED' });
    }, 600));
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
        this.nextWp = 0;
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
        // Climb at the launch point first, as NAV_TAKEOFF does; then fly each
        // waypoint in turn at the cruise speed, adjusting to its altitude.
        if (this.alt < Math.min(this.cruiseAlt, 10) - 0.1 && this.nextWp === 0) {
          this.alt = Math.min(this.cruiseAlt, this.alt + CLIMB_RATE * dt);
          this.speed = 0;
          break;
        }
        const target = this.route[this.nextWp];
        const d = distance(this.pos, target);
        const step = this.cruiseSpeed * dt;
        if (d <= step) {
          this.pos = { lat: target.lat, lng: target.lng };
          this.nextWp++;
          if (this.nextWp >= this.route.length) {
            // A finished mission returns home, as a real autopilot would.
            this.nextWp = this.route.length - 1;
            this.phase = 'rtl';
          }
        } else {
          this.heading = bearing(this.pos, target);
          const k = step / d;
          this.pos = { lat: this.pos.lat + (target.lat - this.pos.lat) * k, lng: this.pos.lng + (target.lng - this.pos.lng) * k };
        }
        const wantAlt = target.alt || this.cruiseAlt;
        const dz = wantAlt - this.alt;
        this.alt += Math.sign(dz) * Math.min(Math.abs(dz), CLIMB_RATE * dt);
        this.speed = this.cruiseSpeed + Math.sin(Date.now() / 4000) * 0.3;
        break;
      }
      case 'hold':
        this.speed = 0;
        break;
      case 'rtl': {
        const d = distance(this.pos, this.home);
        if (d < RTL_SPEED * dt) {
          this.pos = { ...this.home };
          this.phase = 'land';
        } else {
          this.heading = bearing(this.pos, this.home);
          const step = (RTL_SPEED * dt) / d;
          this.pos = {
            lat: this.pos.lat + (this.home.lat - this.pos.lat) * step,
            lng: this.pos.lng + (this.home.lng - this.pos.lng) * step,
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
          this.nextWp = 0;
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
      distanceToHome: Math.round(distance(this.pos, this.home)),
      // 1-based like MISSION_CURRENT on a real autopilot: the item being flown to.
      missionSeq: this.phase === 'ground' ? 0 : this.nextWp + 1,
      missionTotal: this.route.length,
    });
  }
}

export const simulator = new Simulator();
