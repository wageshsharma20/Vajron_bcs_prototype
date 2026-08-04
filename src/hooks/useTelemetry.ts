import { useState, useEffect } from 'react';
import { TelemetryFrame } from '../data/types';
import { telemetryService } from '../services/telemetryService';
import { initialTelemetry } from '../data/mockFleetData';

export function useTelemetry(droneId: string): TelemetryFrame | null {
  const [frame, setFrame] = useState<TelemetryFrame | null>(initialTelemetry[droneId] || null);

  useEffect(() => {
    const unsubscribe = telemetryService.subscribeTelemetry((newFrame) => {
      if (newFrame.droneId === droneId) {
        setFrame(newFrame);
      }
    });
    return unsubscribe;
  }, [droneId]);

  return frame;
}
