import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import MapWaypointEditor, { MapWaypointEditorRef } from '../components/MapWaypointEditor';
import PreFlightChecklist from '../components/PreFlightChecklist';
import { Waypoint, PreFlightCheck } from '../data/types';
import { PageHeader, useHeaderColors, Rule } from '../components/Chrome';
import { FLIGHT_WAYPOINTS } from '../data/flightWaypoints';
import { generateSurveyGrid } from '../data/missionUtils';

export default function MissionPlannerScreen({ navigation }: any) {
  const { theme, tokens, sp } = useTheme();
  const headerColors = useHeaderColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapWaypointEditorRef>(null);

  // Seeded with the surveyed route so the planner opens on the mission the map
  // still already shows, rather than an empty map the operator has to rebuild.
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() =>
    FLIGHT_WAYPOINTS.map(({ lat, lng, altitude }) => ({ lat, lng, altitude })),
  );
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <PageHeader
        title="MISSION PLANNER"
        subtitle={
          <Text style={[styles.headerSubtitle, { color: headerColors.muted }]}>Park: Sanjay Van  ·  DRONE-01</Text>
        }
      />

      <View style={styles.contentRow}>
        <View style={[styles.mapContainer, { padding: tokens.gutter }]}>
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

        {/* Sidebar */}
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: theme.surface,
              paddingHorizontal: tokens.gutter,
              paddingTop: tokens.gutter,
              paddingBottom: insets.bottom + 60,
              borderLeftColor: theme.hairline,
              borderLeftWidth: tokens.rule.hair,
            },
          ]}
        >
          {/* Fields are ruled underneath rather than boxed: a full outline round
              a three-character number is more frame than content, and three of
              them in a row read as three buttons. The rule is the field. */}
          <View style={[styles.paramsRow, { marginBottom: sp(20) }]}>
            <View style={[styles.paramInputGroup, { marginRight: sp(20) }]}>
              <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>ALT (m)</Text>
              <TextInput 
                style={[styles.paramInput, { color: theme.textPrimary, borderBottomColor: theme.textPrimary, borderBottomWidth: tokens.rule.medium }]}
                value={altitude}
                onChangeText={setAltitude}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.paramInputGroup, { marginRight: sp(20) }]}>
              <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>SPD (m/s)</Text>
              <TextInput 
                style={[styles.paramInput, { color: theme.textPrimary, borderBottomColor: theme.textPrimary, borderBottomWidth: tokens.rule.medium }]}
                value={speed}
                onChangeText={setSpeed}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.paramInputGroup}>
              <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>OVERLAP %</Text>
              <TextInput 
                style={[styles.paramInput, { color: theme.textPrimary, borderBottomColor: theme.textPrimary, borderBottomWidth: tokens.rule.medium }]}
                value={overlap}
                onChangeText={setOverlap}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.actionRowSecondary, { marginBottom: sp(4) }]}>
            <TouchableOpacity onPress={() => mapRef.current?.clearWaypoints()} style={styles.textLinkBtn}>
              <Text style={[styles.textLink, { color: theme.textSecondary }]}>Clear Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.textPrimary, borderWidth: tokens.rule.medium, paddingVertical: sp(11), paddingHorizontal: sp(20) }]}
              onPress={handleSurveyGrid}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>SURVEY GRID</Text>
            </TouchableOpacity>
          </View>

          <Rule weight="medium" style={{ marginTop: sp(12) }} />

          <View style={styles.checklistContainer}>
            <PreFlightChecklist checks={mockChecks} onLaunch={handleLaunch} isLaunchDisabled={waypoints.length === 0} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mapContainer: {
    width: '50%',
    position: 'relative',
  },
  checklistOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sidebar: {
    width: '50%',
  },
  paramsRow: {
    flexDirection: 'row',
  },
  paramInputGroup: {
    flex: 1,
  },
  paramLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    marginBottom: 6,
  },
  paramInput: {
    paddingVertical: 6,
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    fontVariant: typography.tabularNums,
    outlineStyle: 'none',
  } as any,
  actionRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textLinkBtn: {
    paddingVertical: 10,
    // Flush to the sidebar gutter, so the link starts on the same edge as the
    // field labels above it rather than eight points inside them.
    paddingRight: 8,
  },
  textLink: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
  secondaryBtn: {
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  checklistContainer: {
    marginTop: 4,
  }
});
