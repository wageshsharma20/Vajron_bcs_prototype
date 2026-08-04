import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent, MarkerDragStartEndEvent } from 'react-native-maps';
import { useTheme } from 'react-native-paper';
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

const silverMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

const MapWaypointEditor = forwardRef<MapWaypointEditorRef, MapWaypointEditorProps>(
  ({ waypoints, onWaypointsChange, defaultAltitude = 30 }, ref) => {
    const theme = useTheme();

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

    const handleMapPress = (e: MapPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      onWaypointsChange([...waypoints, { lat: latitude, lng: longitude, altitude: defaultAltitude }]);
    };

    const handleMarkerDragEnd = (index: number, e: MarkerDragStartEndEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const newWaypoints = [...waypoints];
      newWaypoints[index].lat = latitude;
      newWaypoints[index].lng = longitude;
      onWaypointsChange(newWaypoints);
    };

    return (
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          customMapStyle={silverMapStyle}
          onPress={handleMapPress}
          initialRegion={{
            latitude: 28.535517,
            longitude: 77.191632,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {waypoints.length > 1 && (
            <Polyline
              coordinates={waypoints.map(wp => ({ latitude: wp.lat, longitude: wp.lng }))}
              strokeColor={theme.colors.accentAmber}
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}

          {waypoints.map((wp, index) => (
            <Marker
              key={`wp-${index}`}
              coordinate={{ latitude: wp.lat, longitude: wp.lng }}
              draggable
              onDragEnd={(e) => handleMarkerDragEnd(index, e)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.markerBody, { backgroundColor: theme.colors.accentAmber }]}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
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
