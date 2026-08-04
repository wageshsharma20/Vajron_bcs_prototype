import { TelemetryFrame, DroneAlert, GimbalState } from '../data/types';
import { mockFlightPath } from '../data/mockFlightPath';
import { useTelemetryStore } from '../data/useTelemetryStore';

type AlertCallback = (alert: DroneAlert) => void;

class TelemetryService {
  private alertSubscribers: Set<AlertCallback> = new Set();
  private mockInterval: any = null;
  private pathIndex = 0;

  constructor() {
    this.startMockReplay();
  }

  subscribeAlerts(cb: AlertCallback) {
    this.alertSubscribers.add(cb);
    return () => this.alertSubscribers.delete(cb);
  }

  sendCommand(droneId: string, command: string, payload?: any) {
    console.log(`[Command -> ${droneId}] ${command}`, payload);
    
    // In mock mode, we simulate UI response to command
    if (command === 'hold' || command === 'pause') {
      useTelemetryStore.getState().updateTelemetry(droneId, { flightMode: 'hold' });
    } else if (command === 'resume') {
      useTelemetryStore.getState().updateTelemetry(droneId, { flightMode: 'auto' });
    } else if (command === 'rtl') {
      useTelemetryStore.getState().updateTelemetry(droneId, { flightMode: 'rtl' });
    }
  }

  sendGimbalCommand(droneId: string, state: Partial<GimbalState>) {
    console.log(`[Gimbal -> ${droneId}]`, state);
    // Directly update the Zustand store so the UI reflects the gimbal change instantly
    useTelemetryStore.getState().updateGimbal(droneId, state);
  }

  private startMockReplay() {
    // Replay at 10Hz to simulate real telemetry load
    this.mockInterval = setInterval(() => {
      const frame = { ...mockFlightPath[this.pathIndex] };
      frame.timestamp = new Date().toISOString();

      // Push high-frequency data into Zustand without triggering global React re-renders
      useTelemetryStore.getState().updateTelemetry(frame.droneId, frame);

      // Inject mock alerts at specific times
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
