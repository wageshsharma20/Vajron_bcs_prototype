import { BRIDGE_URL, COMMAND_TOKEN } from '../config';
import { useLinkStore } from '../data/linkStore';
import { simulator } from './simulator';
import type { CommandResult } from './commandLink';

type Wp = { lat: number; lng: number; alt: number };

/**
 * Send the planned mission to whatever aircraft this station is connected to.
 *
 * Every outcome is the aircraft's own answer (MAV_MISSION_ACCEPTED or why it
 * refused). With nothing connected it says so rather than pretending: an
 * "uploaded" mission that never reached an aircraft is exactly the kind of
 * confident wrong answer a ground station must not give.
 */
export async function uploadMission(wps: Wp[]): Promise<CommandResult> {
  const mode = useLinkStore.getState().mode;
  if (mode === 'sim') return simulator.uploadMission(wps);
  if (mode === 'demo') {
    return { ok: false, error: 'No aircraft connected. Connect to a drone or the simulator first.' };
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (COMMAND_TOKEN) headers['X-Vajron-Token'] = COMMAND_TOKEN;
    const r = await fetch(`${BRIDGE_URL}/mission`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ waypoints: wps }),
    });
    if (r.status === 401) return { ok: false, error: 'the bridge rejected this station’s token' };
    return (await r.json()) as CommandResult;
  } catch {
    return { ok: false, error: `could not reach the bridge at ${BRIDGE_URL}` };
  }
}
