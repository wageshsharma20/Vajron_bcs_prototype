import { TelemetryFrame } from './types';

// Generate a simple square path around a start point
function generateMockPath(startLat: number, startLng: number, steps: number): TelemetryFrame[] {
  const path: TelemetryFrame[] = [];
  let lat = startLat;
  let lng = startLng;
  let bat = 84;

  const latStep = 0.0001;
  const lngStep = 0.0001;

  for (let i = 0; i < steps; i++) {
    // Square movement
    if (i < steps / 4) lat += latStep;
    else if (i < steps / 2) lng += lngStep;
    else if (i < 3 * steps / 4) lat -= latStep;
    else lng -= lngStep;

    if (i % 10 === 0 && bat > 10) bat -= 1; // Drain battery

    path.push({
      droneId: 'DRONE-01',
      timestamp: new Date().toISOString(), // Will be updated on emit
      lat,
      lng,
      altitude: 45 + Math.sin(i / 10) * 2, // Slight variation
      heading: i % 360,
      groundSpeed: 8 + Math.random() * 2,
      batteryPercent: bat,
      batteryVoltage: 22.1 - (100 - bat) * 0.02,
      signalStrength: 90 + Math.floor(Math.random() * 10 - 5),
      linkRssi: -45 + Math.floor(Math.random() * 5),
      gpsFixType: '3d',
      gpsSatsVisible: 18,
      flightMode: 'auto',
      isArmed: true,
      distanceToHome: i * 2, // fake distance
      jetsonCpuTemp: 60 + Math.random() * 5,
      jetsonGpuTemp: 55 + Math.random() * 5,
      inferenceFps: 45 + Math.floor(Math.random() * 5 - 2),
    });
  }

  return path;
}

export const mockFlightPath = generateMockPath(28.535517, 77.191632, 200);
