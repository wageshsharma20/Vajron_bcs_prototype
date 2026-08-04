export interface DroneAsset {
  id: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  batteryCycles: number;
  lastMissionId: string | null;
  lastSeenAt: string;
  status: 'idle' | 'in-flight' | 'charging' | 'maintenance' | 'offline';
}

export interface TelemetryFrame {
  droneId: string;
  timestamp: string;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  batteryPercent: number;
  batteryVoltage: number;
  signalStrength: number;
  linkRssi: number;
  gpsFixType: 'none' | '2d' | '3d' | 'rtk';
  gpsSatsVisible: number;
  flightMode: 'manual' | 'stabilize' | 'auto' | 'rtl' | 'land' | 'hold' | 'loiter';
  isArmed: boolean;
  distanceToHome: number;
  jetsonCpuTemp: number;
  jetsonGpuTemp: number;
  inferenceFps: number;
}

export interface GimbalState {
  pitch: number;
  yaw: number;
  zoomLevel: number;
  isRecording: boolean;
  isPhotoMode: boolean;
}

export interface Waypoint {
  lat: number;
  lng: number;
  altitude: number;
  action?: 'photo' | 'hover' | 'gimbal_down' | 'none';
  hoverDuration?: number;
}

export interface SurveyPolygon {
  vertices: { lat: number; lng: number }[];
  lawnmowerSpacing: number;
}

export interface MissionPlan {
  id: string;
  name: string;
  parkId: string;
  droneId: string;
  waypoints: Waypoint[];
  surveyPolygon?: SurveyPolygon;
  altitude: number;
  speed: number;
  overlapPercent: number;
  scheduledAt?: string;
  createdAt: string;
  status: 'draft' | 'pre-flight' | 'active' | 'paused' | 'complete' | 'aborted';
}

export type CheckStatus = 'pass' | 'fail' | 'checking' | 'warning';

export interface PreFlightCheck {
  id: string;
  label: string;
  status: CheckStatus;
  value?: string;
  blocker: boolean;
}

export interface DroneAlert {
  id: string;
  droneId: string;
  type: 'encroachment' | 'low_battery' | 'signal_lost' | 'gps_degraded' | 'obstacle' | 'defect_detected';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  lat?: number;
  lng?: number;
}
