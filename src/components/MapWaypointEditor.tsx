import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../theme';
import { Waypoint } from '../data/types';
import { typography } from '../theme';
import { MapPin } from 'lucide-react-native';

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

const MapWaypointEditor = forwardRef<MapWaypointEditorRef, MapWaypointEditorProps>(
  ({ waypoints, onWaypointsChange, defaultAltitude = 30 }, ref) => {
    const { theme } = useTheme();

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

    return (
      <View style={styles.container}>
      {/* Mock Map Background */}
      <View style={[styles.mapPlaceholder, { backgroundColor: theme.surfaceMuted, borderColor: theme.hairline }]}>
        <MapPin size={24} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
        <Text style={{ fontFamily: typography.fonts.medium, color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', fontSize: typography.sizes.xs }}>Map View</Text>
      </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  markerBody: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerText: {
    color: '#FFF',
    fontFamily: typography.fonts.bold,
    fontSize: 10,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginVertical: 12,
  }
});

export default MapWaypointEditor;
