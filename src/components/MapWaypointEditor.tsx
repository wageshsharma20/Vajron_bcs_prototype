import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../theme';
import { Waypoint } from '../data/types';
import { typography } from '../theme';

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
      <View style={[styles.container, { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontFamily: typography.fonts.medium, color: '#666' }}>[Google Maps API Key Missing]</Text>
        <Text style={{ fontFamily: typography.fonts.regular, color: '#999', marginTop: 4, fontSize: 12 }}>Map rendering is bypassed in this prototype build to prevent crashes.</Text>
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
  }
});

export default MapWaypointEditor;
