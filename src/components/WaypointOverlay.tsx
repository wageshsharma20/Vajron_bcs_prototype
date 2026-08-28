import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography } from '../theme';
import { FLIGHT_WAYPOINTS, projectToFrame } from '../data/flightWaypoints';

/** Anything placeable on the map frame: either pre-traced (nx/ny) or geographic. */
export type PlaceableWaypoint = {
  id?: number;
  nx?: number;
  ny?: number;
  lat: number;
  lng: number;
};

interface WaypointOverlayProps {
  /** Defaults to the traced mission path. Pass a generated grid to draw that instead. */
  waypoints?: PlaceableWaypoint[];
  /** Marker diameter. The planner has room for numbers; the live map does not. */
  size?: number;
  /** Hides the index inside each marker when the map is too small to read it. */
  showLabels?: boolean;
  /**
   * How far through the mission we are, 0-1. Waypoints at or before this point
   * are drawn as reached; the rest stay hollow. Leave undefined to draw them all
   * as planned, which is what the planner wants.
   */
  progress?: number;
}

/**
 * Draws the 20 survey waypoints over a map frame.
 *
 * Positions come from FLIGHT_WAYPOINTS as fractions of the frame, so this sits
 * correctly over both the map video and the still without either knowing the
 * other's pixel size. The parent must be the map frame itself and must not add
 * padding, or the markers will drift off the path.
 */
export default function WaypointOverlay({
  waypoints = FLIGHT_WAYPOINTS,
  size = 18,
  showLabels = true,
  progress,
}: WaypointOverlayProps) {
  const { theme } = useTheme();
  const reachedUpTo = progress === undefined ? -1 : progress * (waypoints.length - 1);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {waypoints.map((wp, i) => {
        // Traced points carry their frame position; anything else (a generated
        // grid) is projected through the same georeference the trace used.
        const { nx, ny } =
          wp.nx !== undefined && wp.ny !== undefined
            ? { nx: wp.nx, ny: wp.ny }
            : projectToFrame(wp.lat, wp.lng);
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;   // off this frame
        const reached = progress !== undefined && i <= reachedUpTo;
        const planned = progress === undefined;
        const fill = planned || reached ? theme.statusGreen : 'rgba(255,255,255,0.28)';
        const border = planned || reached ? '#FFFFFF' : 'rgba(255,255,255,0.75)';

        return (
          <View
            key={wp.id ?? i}
            style={[
              styles.marker,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: fill,
                borderColor: border,
                // Fractions of the frame, offset by half the marker so the dot is
                // centred on the path rather than hanging below and right of it.
                left: `${nx * 100}%`,
                top: `${ny * 100}%`,
                marginLeft: -size / 2,
                marginTop: -size / 2,
              },
            ]}
          >
            {showLabels && (
              <Text style={[styles.label, { fontSize: size * 0.5 }]} numberOfLines={1}>
                {wp.id ?? i + 1}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.bold,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
