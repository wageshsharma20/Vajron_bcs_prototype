import { create } from 'zustand';
import { TelemetryFrame, GimbalState } from './types';
import { initialTelemetry } from './mockFleetData';

interface TelemetryStore {
  // We keep telemetry by drone ID to support fleet-wide monitoring
  telemetry: Record<string, TelemetryFrame>;
  gimbal: Record<string, GimbalState>;
  
  // Actions
  updateTelemetry: (droneId: string, frame: Partial<TelemetryFrame>) => void;
  updateGimbal: (droneId: string, state: Partial<GimbalState>) => void;
}

const defaultGimbal: GimbalState = {
  pitch: 0,
  yaw: 0,
  zoomLevel: 1,
  isRecording: false,
  isPhotoMode: false,
};

// Initialize with some mock data for all drones
const initialGimbalState = Object.keys(initialTelemetry).reduce((acc, id) => {
  acc[id] = { ...defaultGimbal };
  return acc;
}, {} as Record<string, GimbalState>);

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  telemetry: initialTelemetry,
  gimbal: initialGimbalState,
  
  updateTelemetry: (droneId, frame) => set((state) => ({
    telemetry: {
      ...state.telemetry,
      [droneId]: {
        ...state.telemetry[droneId],
        ...frame,
        timestamp: new Date().toISOString(),
      }
    }
  })),

  updateGimbal: (droneId, gimbalState) => set((state) => ({
    gimbal: {
      ...state.gimbal,
      [droneId]: {
        ...state.gimbal[droneId],
        ...gimbalState,
      }
    }
  }))
}));
