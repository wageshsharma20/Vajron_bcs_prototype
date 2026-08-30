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
  /**
   * 'idle' is the on-ground, disarmed state. It was missing from this union
   * while both the seed data and the RTL reset assigned it, so the two call
   * sites were type errors even though the spine has always displayed it.
   */
  flightMode: 'idle' | 'manual' | 'stabilize' | 'auto' | 'rtl' | 'land' | 'hold' | 'loiter';
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

/**
 * A maintenance category and its rows, as shown by InspectionAccordion.
 *
 * Previously imported from '../types', a module that does not exist — so the
 * component's `data` prop resolved to an error type and its callbacks fell back
 * to implicit `any`. Declared here with the rest of the domain types.
 */
export type InspectionItemStatus = 'good' | 'attention' | 'issue' | 'critical';

export type InspectionItem = {
  id: string;
  name: string;
  value: string;
  status: InspectionItemStatus;
};

export type InspectionCategory = {
  category: string;
  /** Key into the accordion's icon map. */
  iconName: string;
  items: InspectionItem[];
};
