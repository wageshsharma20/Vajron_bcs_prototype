import { Waypoint } from './types';

// Haversine formula to get distance between two points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Convert meters to lat/lng offset approximately
function metersToLng(meters: number, lat: number) {
  return meters / (111320 * Math.cos(lat * (Math.PI / 180)));
}
function metersToLat(meters: number) {
  return meters / 111000;
}

export function generateSurveyGrid(
  polygon: { lat: number; lng: number }[],
  spacing: number,
  altitude: number
): Waypoint[] {
  if (polygon.length < 3) return [];

  // 1. Find bounding box
  let minLat = polygon[0].lat;
  let maxLat = polygon[0].lat;
  let minLng = polygon[0].lng;
  let maxLng = polygon[0].lng;

  for (const pt of polygon) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;
  }

  const waypoints: Waypoint[] = [];
  
  // 2. Simple sweep line algorithm (lawnmower pattern)
  // Sweep from minLat to maxLat
  const latStep = metersToLat(spacing);
  let sweepRight = true;

  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    // In a real robust implementation, we would compute intersection of the latitude line
    // with the polygon segments. For this frontend mock, we'll just use the bounding box longitudes
    // to simulate the sweep.
    if (sweepRight) {
      waypoints.push({ lat, lng: minLng, altitude });
      waypoints.push({ lat, lng: maxLng, altitude });
    } else {
      waypoints.push({ lat, lng: maxLng, altitude });
      waypoints.push({ lat, lng: minLng, altitude });
    }
    sweepRight = !sweepRight;
  }

  return waypoints;
}
