import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { useTheme } from '../theme';
import { Waypoint } from '../data/types';
import { typography } from '../theme';
import WaypointOverlay, { PlaceableWaypoint } from './WaypointOverlay';
import { FLIGHT_WAYPOINTS, MAP_FRAME_ASPECT } from '../data/flightWaypoints';
import { useFittedFrame } from '../hooks/useFittedFrame';

interface MapWaypointEditorProps {
  waypoints: Waypoint[];
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  defaultAltitude?: number;
}

export interface MapWaypointEditorRef {
  addWaypoint: (lat: number, lng: number) => void;
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;
}

/**
 * The planner's map.
 *
 * The backdrop is the last frame of the flight-path recording, so the planner
 * and Mission Control show the same ground at the same scale — the survey route
 * is already drawn into it. Waypoints sit on top as an overlay, which keeps them
 * selectable and lets an edited route diverge from the line baked into the still.
 */
const MapWaypointEditor = forwardRef<MapWaypointEditorRef, MapWaypointEditorProps>(
  ({ waypoints, onWaypointsChange, defaultAltitude = 30 }, ref) => {
    const { theme } = useTheme();
    const { onLayout, style: frameSize } = useFittedFrame(MAP_FRAME_ASPECT);

    useImperativeHandle(ref, () => ({
      addWaypoint: (lat: number, lng: number) => {
        onWaypointsChange([...waypoints, { lat, lng, altitude: defaultAltitude }]);
      },
      removeWaypoint: (index: number) => {
        const newWaypoints = [...waypoints];
        newWaypoints.splice(index, 1);
        onWaypointsChange(newWaypoints);
      },
      clearWaypoints: () => {
        onWaypointsChange([]);
      }
    }));

    // Waypoints seeded from the mission keep their traced frame position; ones
    // generated later only have coordinates and get projected by the overlay.
    const placeable: PlaceableWaypoint[] = waypoints.map((wp, i) => {
      const traced = FLIGHT_WAYPOINTS[i];
      const isTraced = traced && traced.lat === wp.lat && traced.lng === wp.lng;
      return isTraced ? traced : { id: i + 1, lat: wp.lat, lng: wp.lng };
    });

    return (
      <View style={styles.container} onLayout={onLayout}>
        {/* Locked to the source frame's ratio so the still and the markers share
            one coordinate space; measured against the slot so it fits whichever
            of the two dimensions is the tighter one. */}
        <View style={[styles.frame, frameSize, { borderColor: theme.hairline }]}>
          {/* Sized explicitly rather than with absoluteFill: on web the Image
              keeps its intrinsic 832x336 box under absoluteFill and simply gets
              clipped by the frame, which slides the map under the markers. */}
          <Image
            source={require('../../assets/map-plan-still.png')}
            style={styles.mapImage}
            resizeMode="stretch"
          />

          <WaypointOverlay waypoints={placeable} size={18} showLabels />

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              SANJAY LAKE · {waypoints.length} WAYPOINT{waypoints.length === 1 ? '' : 'S'}
            </Text>
          </View>

          {waypoints.length === 0 && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Text style={styles.emptyText}>No waypoints — generate a survey grid to begin</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Top-aligned, not centred: the map is the left column of a two-column page,
    // so its first edge should start on the same line as the sidebar's first
    // field rather than floating in the middle of its half.
    justifyContent: 'flex-start',
  },
  mapImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#0E1512',
  },
  badge: {
    position: 'absolute',
    // Flush into the frame's corner as a plate rather than floating inset: the
    // frame's own edge does the containing, so the label needs no second one.
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  emptyHint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.45)',
  },
  emptyText: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default MapWaypointEditor;
