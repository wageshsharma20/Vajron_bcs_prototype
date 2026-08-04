import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import MapWaypointEditor, { MapWaypointEditorRef } from '../components/MapWaypointEditor';
import PreFlightChecklist from '../components/PreFlightChecklist';
import { Waypoint, PreFlightCheck } from '../data/types';
import { generateSurveyGrid } from '../data/missionUtils';

export default function MissionPlannerScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapWaypointEditorRef>(null);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [altitude, setAltitude] = useState('30');
  const [speed, setSpeed] = useState('5');
  const [overlap, setOverlap] = useState('70');
  const [showChecklist, setShowChecklist] = useState(false);

  const mockChecks: PreFlightCheck[] = [
    { id: '1', label: 'Battery Charge', status: 'pass', value: '84%', blocker: true },
    { id: '2', label: 'GPS Fix Quality', status: 'pass', value: '3D Fix', blocker: true },
    { id: '3', label: 'Airspace Check (Digital Sky)', status: 'warning', value: 'Not integrated', blocker: false },
    { id: '4', label: 'Wind Speed', status: 'pass', value: '12 km/h', blocker: false },
  ];

  const handleSurveyGrid = () => {
    // Generate a mock polygon around Sanjay Van
    const mockPolygon = [
      { lat: 28.535, lng: 77.191 },
      { lat: 28.536, lng: 77.191 },
      { lat: 28.536, lng: 77.192 },
      { lat: 28.535, lng: 77.192 },
    ];
    const generated = generateSurveyGrid(mockPolygon, 20, parseInt(altitude) || 30);
    setWaypoints(generated);
  };

  const handleLaunch = () => {
    setShowChecklist(false);
    navigation.navigate('MissionControl', { droneId: 'DRONE-01' }); // Mock default
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>MISSION PLANNER</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Park: Sanjay Van  ·  DRONE-01</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapWaypointEditor 
          ref={mapRef}
          waypoints={waypoints}
          onWaypointsChange={setWaypoints}
          defaultAltitude={parseInt(altitude) || 30}
        />

        {showChecklist && (
          <View style={styles.checklistOverlay}>
            <PreFlightChecklist checks={mockChecks} onLaunch={handleLaunch} />
          </View>
        )}
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 60 }]}>
        <View style={styles.paramsRow}>
          <View style={styles.paramInputGroup}>
            <Text style={[styles.paramLabel, { color: theme.colors.textSecondary }]}>ALT (m)</Text>
            <TextInput 
              style={[styles.paramInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={altitude}
              onChangeText={setAltitude}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.paramInputGroup}>
            <Text style={[styles.paramLabel, { color: theme.colors.textSecondary }]}>SPD (m/s)</Text>
            <TextInput 
              style={[styles.paramInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={speed}
              onChangeText={setSpeed}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.paramInputGroup}>
            <Text style={[styles.paramLabel, { color: theme.colors.textSecondary }]}>OVERLAP %</Text>
            <TextInput 
              style={[styles.paramInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={overlap}
              onChangeText={setOverlap}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.border }]} onPress={() => mapRef.current?.clearWaypoints()}>
            <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.border }]} onPress={handleSurveyGrid}>
            <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>SURVEY GRID</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.colors.accentAmber, borderColor: theme.colors.accentAmber }]}
            onPress={() => setShowChecklist(true)}
            disabled={waypoints.length === 0}
          >
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>REVIEW & LAUNCH</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  checklistOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DEE2E6',
  },
  paramsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paramInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  paramLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  paramInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    textAlign: 'center',
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
  }
});
