import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme, typography } from '../theme';
import { MAP_TILES } from '../config';

// Leaflet is a browser library, and this station runs in a browser (the Pi
// kiosk and the website). expo-maps and react-native-maps have no web support,
// which is why the maps were recordings until now.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const L: typeof import('leaflet') | null = Platform.OS === 'web' ? require('leaflet') : null;
if (Platform.OS === 'web') require('leaflet/dist/leaflet.css');

type Pt = { lat: number; lng: number };
export type MapWaypoint = Pt & { id?: string; alt?: number };

export interface GeoMapProps {
  waypoints: MapWaypoint[];
  /** Click the map to add a waypoint; drag a waypoint to move it. */
  editable?: boolean;
  selectedId?: string | null;
  onAdd?: (lat: number, lng: number) => void;
  onMove?: (id: string, lat: number, lng: number) => void;
  onSelect?: (id: string | null) => void;
  /** Index into `waypoints` of the aircraft's current target. */
  currentIndex?: number;
  aircraft?: (Pt & { heading: number }) | null;
  home?: Pt | null;
  track?: Pt[];
  /** Keep the aircraft in view. */
  follow?: boolean;
  /** Changing this refits the view to the waypoints. */
  fitKey?: string;
  label?: string;
}

const C = {
  brand: '#143521',
  pale: '#A3C9AE',
  amber: '#C67B33',
  white: '#FFFFFF',
  track: '#E4C3A0',
};

function wpIcon(n: number, state: 'normal' | 'selected' | 'current' | 'done') {
  const bg = state === 'selected' ? C.amber : state === 'done' ? C.pale : C.brand;
  const fg = state === 'done' ? C.brand : C.white;
  const ring = state === 'current' ? `box-shadow:0 0 0 3px ${C.amber};` : '';
  return L!.divIcon({
    className: 'gcs-wp',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="width:24px;height:24px;border-radius:12px;background:${bg};color:${fg};
      border:2px solid ${C.white};${ring}display:flex;align-items:center;justify-content:center;
      font:700 11px -apple-system,Helvetica,Arial,sans-serif;box-sizing:border-box">${n}</div>`,
  });
}

function aircraftIcon(heading: number) {
  return L!.divIcon({
    className: 'gcs-aircraft',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<svg width="34" height="34" viewBox="0 0 34 34" style="transform:rotate(${heading}deg)">
      <path d="M17 3 L27 29 L17 23 L7 29 Z" fill="${C.white}" stroke="${C.brand}" stroke-width="2.2"
        stroke-linejoin="round"/></svg>`,
  });
}

const homeIcon = () =>
  L!.divIcon({
    className: 'gcs-home',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;background:${C.white};color:${C.brand};border:2px solid ${C.brand};
      display:flex;align-items:center;justify-content:center;font:800 11px -apple-system,Helvetica,Arial,sans-serif;
      box-sizing:border-box">H</div>`,
  });

export default function GeoMap(props: GeoMapProps) {
  const { theme } = useTheme();
  const hostRef = useRef<any>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layers = useRef<{ [k: string]: any }>({});
  const cb = useRef(props);
  cb.current = props;
  const [offline, setOffline] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!L || !hostRef.current) return;
    const el: HTMLElement = hostRef.current;
    const map = L.map(el, { zoomControl: true, attributionControl: true, preferCanvas: false });
    map.setView([28.6185, 77.3095], 15);

    let loaded = 0;
    let failed = 0;
    const tiles = L.tileLayer(MAP_TILES.url, { maxZoom: MAP_TILES.maxZoom, attribution: MAP_TILES.attribution });
    tiles.on('tileload', () => { loaded++; setOffline(false); });
    tiles.on('tileerror', () => { failed++; if (failed >= 4 && loaded === 0) setOffline(true); });
    tiles.addTo(map);

    layers.current.route = L.polyline([], { color: C.white, weight: 3, opacity: 0.9, dashArray: '6 6' }).addTo(map);
    layers.current.track = L.polyline([], { color: C.track, weight: 3, opacity: 0.95 }).addTo(map);
    layers.current.wps = L.layerGroup().addTo(map);

    map.on('click', (e: any) => {
      const p = cb.current;
      if (p.editable && p.onAdd) p.onAdd(e.latlng.lat, e.latlng.lng);
      else if (p.onSelect) p.onSelect(null);
    });

    mapRef.current = map;
    // Leaflet measures its container once; keep it right when the layout moves.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // Waypoints and route.
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;
    const { waypoints, editable, selectedId, currentIndex } = props;
    layers.current.route.setLatLngs(waypoints.map(w => [w.lat, w.lng]));
    const group = layers.current.wps;
    group.clearLayers();
    waypoints.forEach((w, i) => {
      const state =
        w.id && w.id === selectedId ? 'selected'
          : currentIndex !== undefined && i === currentIndex ? 'current'
            : currentIndex !== undefined && i < currentIndex ? 'done' : 'normal';
      const m = L!.marker([w.lat, w.lng], { icon: wpIcon(i + 1, state), draggable: !!editable && !!w.id, keyboard: false });
      if (w.alt !== undefined) m.bindTooltip(`WP ${i + 1} · ${Math.round(w.alt)} m`, { direction: 'top', offset: [0, -12] });
      m.on('click', (e: any) => { L!.DomEvent.stopPropagation(e); cb.current.onSelect?.(w.id ?? null); });
      m.on('dragend', () => { const ll = m.getLatLng(); if (w.id) cb.current.onMove?.(w.id, ll.lat, ll.lng); });
      group.addLayer(m);
    });
  }, [props.waypoints, props.editable, props.selectedId, props.currentIndex]);

  // Fit to the route when asked (and the first time there is one).
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map || props.waypoints.length === 0) return;
    if (fitted.current && props.fitKey === undefined) return;
    map.fitBounds(L.latLngBounds(props.waypoints.map(w => [w.lat, w.lng] as [number, number])), { padding: [40, 40], maxZoom: 17 });
    fitted.current = true;
  }, [props.fitKey, props.waypoints.length === 0]);

  // Aircraft, home, track.
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;
    const { aircraft, home, track, follow } = props;
    if (aircraft) {
      if (!layers.current.aircraft) layers.current.aircraft = L.marker([aircraft.lat, aircraft.lng], { icon: aircraftIcon(aircraft.heading), interactive: false, zIndexOffset: 1000 }).addTo(map);
      layers.current.aircraft.setLatLng([aircraft.lat, aircraft.lng]);
      layers.current.aircraft.setIcon(aircraftIcon(aircraft.heading));
      // Pan only when the aircraft nears the edge, so the map does not swim.
      if (follow && !map.getBounds().pad(-0.25).contains([aircraft.lat, aircraft.lng])) map.panTo([aircraft.lat, aircraft.lng]);
    } else if (layers.current.aircraft) {
      layers.current.aircraft.remove();
      layers.current.aircraft = null;
    }
    if (home) {
      if (!layers.current.home) layers.current.home = L.marker([home.lat, home.lng], { icon: homeIcon(), interactive: false }).addTo(map);
      layers.current.home.setLatLng([home.lat, home.lng]);
    }
    layers.current.track.setLatLngs((track ?? []).map(p => [p.lat, p.lng]));
  }, [props.aircraft, props.home, props.track, props.follow]);

  if (!L) {
    return (
      <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandDeep }]}>
        <Text style={{ color: theme.onBrand }}>Map available in the web station</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.brandDeep }]}>
      <View ref={hostRef} style={styles.fill} />
      {props.label ? (
        <View style={[styles.badge, { backgroundColor: theme.overlay }]} pointerEvents="none">
          <Text style={styles.badgeText}>{props.label}</Text>
        </View>
      ) : null}
      {offline ? (
        <View style={[styles.offline, { backgroundColor: theme.overlayHeavy }]} pointerEvents="none">
          <Text style={styles.offlineText}>
            Satellite imagery unavailable (no internet). Positions, route and aircraft are still accurate.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  badge: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 8, paddingVertical: 4, zIndex: 500 },
  badgeText: { color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  offline: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, zIndex: 500 },
  offlineText: { color: '#FFFFFF', fontFamily: typography.fonts.semiBold, fontSize: 12 },
});
