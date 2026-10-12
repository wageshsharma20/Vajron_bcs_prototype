import { useEffect, useState } from 'react';
import { BRIDGE_URL } from '../config';
import { useLinkStore } from '../data/linkStore';
import { useTelemetryStore } from '../data/useTelemetryStore';

export type AircraftMission =
  | { status: 'demo' }
  | { status: 'loading' }
  | { status: 'ok'; count: number; waypoints: { seq: number; lat: number; lng: number; alt: number }[] }
  | { status: 'error'; error: string };

/**
 * The mission the aircraft actually holds, read back through the bridge.
 *
 * Read-only by design. QGroundControl plans and uploads; this station only
 * reads. Two stations both writing missions is how an aircraft ends up flying
 * a plan neither operator is looking at.
 *
 * Re-read whenever the aircraft reports a different mission length, which is
 * what happens when QGC uploads a new plan. The bridge caches, so this is
 * cheap when nothing changed.
 */
export function useAircraftMission(droneId: string): AircraftMission {
  const mode = useLinkStore(s => s.mode);
  const linked = useLinkStore(s => s.liveDroneId);
  const total = useTelemetryStore(s => s.telemetry[droneId]?.missionTotal ?? 0);
  const [mission, setMission] = useState<AircraftMission>({ status: 'demo' });

  const real = mode !== 'demo' && linked === droneId;

  useEffect(() => {
    if (!real) {
      setMission({ status: 'demo' });
      return;
    }
    let cancelled = false;
    setMission(m => (m.status === 'ok' ? m : { status: 'loading' }));
    fetch(`${BRIDGE_URL}/mission`)
      .then(r => r.json())
      .then(body => {
        if (cancelled) return;
        setMission(body.ok
          ? { status: 'ok', count: body.waypoints.length, waypoints: body.waypoints }
          : { status: 'error', error: body.error ?? 'the bridge could not read the mission' });
      })
      .catch(() => {
        if (!cancelled) setMission({ status: 'error', error: `could not reach the bridge at ${BRIDGE_URL}` });
      });
    return () => { cancelled = true; };
  }, [real, total]);

  return mission;
}
