import { useTelemetryStore } from '../data/useTelemetryStore';
import { TelemetryFrame } from '../data/types';

// Helper hook to access a specific drone's telemetry from the global store
export function useTelemetry(droneId: string): TelemetryFrame | null {
  // We extract just this drone's telemetry object. 
  // Zustand handles shallow equality natively to prevent some re-renders,
  // but for a fully optimized HUD, child components should select specific fields.
  const telemetry = useTelemetryStore(state => state.telemetry[droneId]);
  return telemetry || null;
}

