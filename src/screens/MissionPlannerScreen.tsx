import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import MapWaypointEditor, { MapWaypointEditorRef } from '../components/MapWaypointEditor';
import PreFlightChecklist from '../components/PreFlightChecklist';
import { Waypoint, PreFlightCheck } from '../data/types';
import { Page, useHeaderColors, Rule, VRule } from '../components/Chrome';
import LayoutSwitcher from '../components/LayoutSwitcher';
import { PLAN_LAYOUTS, type PlanLayout } from './planLayouts';
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
  // Scaffolding: which arrangement is being shown. Remove with the switcher.
  const [layoutId, setLayoutId] = useState<PlanLayout>('sidebar');

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

  // ── The pieces ────────────────────────────────────────────────────────────
  // Every arrangement below is built from exactly these, resized and
  // repositioned. Nothing is added or dropped between them.

  const g = tokens.gutter;

  const map = (
    <View style={styles.mapSlot}>
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
  );

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    last = false,
    stacked = false,
  ) => (
    <View
      style={[
        styles.paramInputGroup,
        last ? null : stacked ? { marginBottom: sp(16) } : { marginRight: sp(20) },
      ]}
    >
      <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput 
        style={[
          styles.paramInput,
          {
            color: theme.textPrimary,
            borderBottomColor: theme.textPrimary,
            borderBottomWidth: tokens.rule.medium,
          },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );

  /**
   * The three flight parameters. Ruled underneath rather than boxed: a full
   * outline round a three-character number is more frame than content, and
   * three of them in a row read as three buttons. The rule is the field.
   *
   * Stacked in the narrow arrangements, where three across leaves each label
   * about fifty points and "OVERLAP %" breaks across two lines.
   */
  const params = (stacked = false) => (
    <View style={stacked ? undefined : styles.paramsRow}>
      {field('ALT (m)', altitude, setAltitude, false, stacked)}
      {field('SPD (m/s)', speed, setSpeed, false, stacked)}
      {field('OVERLAP %', overlap, setOverlap, true, stacked)}
    </View>
  );

  /** Clear the route, or generate one. */
  const routeActions = (
    <View style={styles.actionRowSecondary}>
      <TouchableOpacity onPress={() => mapRef.current?.clearWaypoints()} style={styles.textLinkBtn}>
        <Text style={[styles.textLink, { color: theme.textSecondary }]}>Clear Map</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.secondaryBtn,
          {
            borderColor: theme.textPrimary,
            borderWidth: tokens.rule.hair,
            paddingVertical: sp(11),
            paddingHorizontal: sp(20),
          },
        ]}
        onPress={handleSurveyGrid}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>SURVEY GRID</Text>
      </TouchableOpacity>
    </View>
  );

  const checklist = (part: 'all' | 'checks' | 'launch') => (
    <PreFlightChecklist
      checks={mockChecks}
      onLaunch={handleLaunch}
      isLaunchDisabled={waypoints.length === 0}
      part={part}
    />
  );

  // ── The arrangements ──────────────────────────────────────────────────────

  const layouts: Record<PlanLayout, React.ReactNode> = {
    // Controls in a left column read top to bottom in the order the operator
    // works through them — set the figures, generate or clear the route, then
    // run the checks — with the map filling whatever width is left.
    sidebar: (
      <View style={styles.row}>
        <View
          style={[
            styles.column,
            {
              width: '44%',
              paddingHorizontal: g,
              paddingTop: g,
              paddingBottom: insets.bottom + sp(24),
              borderRightWidth: tokens.rule.hair,
              borderRightColor: theme.hairline,
            },
          ]}
        >
          <View style={{ marginBottom: sp(22) }}>{params()}</View>
          {routeActions}
          <Rule weight="medium" style={{ marginTop: sp(16) }} />
          <View style={{ marginTop: 4 }}>{checklist('all')}</View>
        </View>
        <View style={{ flex: 1, padding: g }}>{map}</View>
      </View>
    ),

    // The map takes the full width of the page — the largest it gets — and the
    // brief becomes three ruled columns beneath it.
    atlas: (
      <>
        <View style={{ flex: 1, padding: g }}>{map}</View>
        <Rule weight="thick" color={theme.textPrimary} />
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: g,
            paddingTop: sp(18),
            paddingBottom: insets.bottom + sp(18),
          }}
        >
          <View style={{ flex: 1.2, paddingRight: g }}>
            {params()}
            <View style={{ marginTop: sp(14) }}>{routeActions}</View>
          </View>
          <VRule />
          <View style={{ flex: 1.4, paddingHorizontal: g }}>{checklist('checks')}</View>
          <VRule />
          <View style={{ flex: 0.9, paddingLeft: g, justifyContent: 'center' }}>
            {checklist('launch')}
          </View>
        </View>
      </>
    ),

    // A narrow rail holds only what shapes the route; the checks and the launch
    // control drop to a band across the foot, so the map gets both the width
    // the sidebar was taking and the full height above that band.
    rail: (
      <>
        <View style={styles.row}>
          <View
            style={[
              styles.column,
              {
                width: '24%',
                paddingHorizontal: g,
                paddingTop: g,
                borderRightWidth: tokens.rule.hair,
                borderRightColor: theme.hairline,
              },
            ]}
          >
            <View style={{ marginBottom: sp(22) }}>{params(true)}</View>
            {routeActions}
          </View>
          <View style={{ flex: 1, padding: g }}>{map}</View>
        </View>
        <Rule weight="thick" color={theme.textPrimary} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: g,
            paddingTop: sp(14),
            paddingBottom: insets.bottom + sp(16),
          }}
        >
          <View style={{ flex: 2.4, paddingRight: g }}>{checklist('checks')}</View>
          <VRule />
          <View style={{ flex: 1, paddingLeft: g }}>{checklist('launch')}</View>
        </View>
      </>
    ),

    // The mirror of Sidebar: map first, brief second. Reading order runs from
    // the thing being planned to the settings that describe it.
    brief: (
      <View style={styles.row}>
        <View style={{ flex: 1, padding: g }}>{map}</View>
        <View
          style={[
            styles.column,
            {
              width: '40%',
              paddingHorizontal: g,
              paddingTop: g,
              paddingBottom: insets.bottom + sp(24),
              borderLeftWidth: tokens.rule.hair,
              borderLeftColor: theme.hairline,
            },
          ]}
        >
          <View style={{ marginBottom: sp(22) }}>{params()}</View>
          {routeActions}
          <Rule weight="medium" style={{ marginTop: sp(16) }} />
          <View style={{ marginTop: 4 }}>{checklist('all')}</View>
        </View>
      </View>
    ),

    // Parameters as a strip across the top and the brief along the foot, so the
    // map holds the whole middle of the page at full width.
    header: (
      <>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: g,
            paddingVertical: sp(16),
            borderBottomWidth: tokens.rule.hair,
            borderBottomColor: theme.hairline,
          }}
        >
          <View style={{ flex: 2 }}>{params()}</View>
          <View style={{ flex: 1.1, paddingLeft: g }}>{routeActions}</View>
        </View>
        <View style={{ flex: 1, padding: g }}>{map}</View>
        <Rule weight="thick" color={theme.textPrimary} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: g,
            paddingTop: sp(14),
            paddingBottom: insets.bottom + sp(16),
          }}
        >
          <View style={{ flex: 2.4, paddingRight: g }}>{checklist('checks')}</View>
          <VRule />
          <View style={{ flex: 1, paddingLeft: g }}>{checklist('launch')}</View>
        </View>
      </>
    ),

    // Map above, brief below, split down the middle: what the aircraft must
    // satisfy on the left, what the operator sets on the right.
    split: (
      <>
        <View style={{ flex: 1, padding: g }}>{map}</View>
        <Rule weight="thick" color={theme.textPrimary} />
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: g,
            paddingTop: sp(16),
            paddingBottom: insets.bottom + sp(16),
          }}
        >
          <View style={{ flex: 1.3, paddingRight: g }}>{checklist('checks')}</View>
          <VRule />
          <View style={{ flex: 1, paddingLeft: g }}>
            {params()}
            <View style={{ marginTop: sp(14) }}>{routeActions}</View>
            <View style={{ marginTop: sp(16) }}>{checklist('launch')}</View>
          </View>
        </View>
      </>
    ),

    // Everything that is not the map goes into a narrow tower on the right, so
    // no horizontal band is spent on any of it and the map keeps the rest.
    tower: (
      <View style={styles.row}>
        <View style={{ flex: 1, padding: g }}>{map}</View>
        <View
          style={{
            width: '34%',
            borderLeftWidth: tokens.rule.hair,
            borderLeftColor: theme.hairline,
          }}
        >
          <View style={{ paddingHorizontal: g, paddingTop: g, paddingBottom: sp(18) }}>
            {params(true)}
            <View style={{ marginTop: sp(16) }}>{routeActions}</View>
          </View>
          <Rule />
          <View style={{ paddingHorizontal: g, paddingTop: sp(4) }}>{checklist('checks')}</View>
          <View
            style={{
              marginTop: 'auto',
              paddingHorizontal: g,
              paddingTop: sp(14),
              paddingBottom: insets.bottom + sp(16),
              borderTopWidth: tokens.rule.hair,
              borderTopColor: theme.hairline,
            }}
          >
            {checklist('launch')}
          </View>
        </View>
      </View>
    ),
  };

  return (
    <Page
      title="MISSION PLANNER"
      subtitle={
        <View>
          <Text style={[styles.headerSubtitle, { color: headerColors.muted }]}>PARK: SANJAY VAN</Text>
          <Text style={[styles.headerSubtitle, { color: headerColors.muted }]}>DRONE-01</Text>
        </View>
      }
      spineFoot={<LayoutSwitcher options={PLAN_LAYOUTS} value={layoutId} onChange={setLayoutId} />}
    >
      {layouts[layoutId]}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerSubtitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 19,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    // Columns never scroll here; if a brief outgrows the page it should be
    // caught in review rather than hidden behind a scrollbar.
    flexShrink: 1,
  },
  mapSlot: {
    flex: 1,
    position: 'relative',
  },
  checklistOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  paramsRow: {
    flexDirection: 'row',
  },
  paramInputGroup: {
    flex: 1,
  },
  paramLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
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
    // Flush to the gutter, so the link starts on the same edge as the field
    // labels above it.
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
    fontSize: 12,
    letterSpacing: 1.1,
  },
});
