import { TelemetryFrame, DroneAlert, GimbalState } from '../data/types';
import { mockFlightPath } from '../data/mockFlightPath';
import { initialTelemetry } from '../data/mockFleetData';

type TelemetryCallback = (frame: TelemetryFrame) => void;
type AlertCallback = (alert: DroneAlert) => void;

class TelemetryService {
  private telemetrySubscribers: Set<TelemetryCallback> = new Set();
  private alertSubscribers: Set<AlertCallback> = new Set();
  private mockInterval: any = null;
  private pathIndex = 0;

  constructor() {
    this.startMockReplay();
  }

  subscribeTelemetry(cb: TelemetryCallback) {
    this.telemetrySubscribers.add(cb);
    return () => this.telemetrySubscribers.delete(cb);
  }

  subscribeAlerts(cb: AlertCallback) {
    this.alertSubscribers.add(cb);
    return () => this.alertSubscribers.delete(cb);
  }

  sendCommand(droneId: string, command: string, payload?: any) {
    console.log(`[Command -> ${droneId}] ${command}`, payload);
    // In mock mode, we just log. In real mode, send via websocket.
  }

  sendGimbalCommand(droneId: string, state: Partial<GimbalState>) {
    console.log(`[Gimbal -> ${droneId}]`, state);
  }

  private startMockReplay() {
    // Replay at 10Hz
    this.mockInterval = setInterval(() => {
      const frame = { ...mockFlightPath[this.pathIndex] };
      frame.timestamp = new Date().toISOString();

      this.telemetrySubscribers.forEach(cb => cb(frame));

      // Inject mock alerts
      if (this.pathIndex === 50) {
        this.alertSubscribers.forEach(cb => cb({
          id: 'alt-1',
          droneId: 'DRONE-01',
          type: 'encroachment',
          severity: 'warning',
          message: 'Encroachment detected near Sector 4.',
          timestamp: new Date().toISOString()
        }));
      }

      this.pathIndex = (this.pathIndex + 1) % mockFlightPath.length;
    }, 100);
  }
}

export const telemetryService = new TelemetryService();
