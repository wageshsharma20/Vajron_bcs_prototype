import { BRIDGE_URL, COMMAND_TOKEN } from '../config';

export type CommandName = 'takeoff' | 'rtl' | 'land' | 'hold' | 'pause' | 'resume' | 'arm' | 'disarm';

export interface CommandResult {
  ok: boolean;
  /** The autopilot's own verdict, e.g. MAV_RESULT_ACCEPTED. */
  result?: string;
  error?: string;
}

/**
 * Sends a command to the aircraft through the bridge.
 *
 * Reports what the autopilot actually said rather than assuming the command
 * took. A rejected RTL that the interface displays as accepted is how an
 * operator ends up believing a drone is coming home while it carries on.
 */
export async function sendVehicleCommand(
  command: CommandName,
  opts: { altitude?: number } = {},
): Promise<CommandResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (COMMAND_TOKEN) headers['X-Vajron-Token'] = COMMAND_TOKEN;

    const response = await fetch(`${BRIDGE_URL}/command`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ command, ...opts }),
    });
    const body = (await response.json()) as CommandResult;
    if (response.status === 401) {
      return { ok: false, error: 'the bridge rejected this station\u2019s token' };
    }
    if (!body.ok) {
      console.warn(`[command] ${command} refused: ${body.error ?? body.result}`);
    }
    return body;
  } catch (err) {
    // A dead bridge and a refusing aircraft are different problems and the
    // operator needs to be able to tell which one they have.
    return { ok: false, error: `could not reach the bridge at ${BRIDGE_URL}` };
  }
}
