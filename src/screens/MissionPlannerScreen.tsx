import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useTheme, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GeoMap from '../components/GeoMap';
import PreFlightChecklist from '../components/PreFlightChecklist';
import { PreFlightCheck } from '../data/types';
import { Page, useHeaderColors, Rule, VRule } from '../components/Chrome';
import { generateSurveyGrid } from '../data/missionUtils';
import { useAircraftMission } from '../hooks/useAircraftMission';
import { useMissionStore, routeKey, routeLength } from '../data/missionStore';
import { useLinkStore } from '../data/linkStore';
import { useTelemetryStore } from '../data/useTelemetryStore';
import { uploadMission } from '../services/missionUpload';

const DRONE = 'DRONE-01';

/**
 * Mission Planner.
 *
 * The plan is drawn on a real satellite map: click to add a waypoint, drag to
 * move it, tap one to change its altitude or remove it. Parameters run across
 * the top, the map holds the middle, and the pre-flight brief runs along the
 * foot -- built from live telemetry, never from fixed values.
 *
 * Launch is locked until the aircraft holds exactly this plan. The drawn route
 * and the uploaded route are different things until the aircraft confirms the
 * upload, and an operator must never be able to launch believing the former.
 */
export default function MissionPlannerScreen({ navigation }: any) {
  const { theme, tokens, sp } = useTheme();
  const headerColors = useHeaderColors();
  const insets = useSafeAreaInsets();

  const m = useMissionStore();
  const mode = useLinkStore(s => s.mode);
  const linked = useLinkStore(s => s.liveDroneId);
  const telemetry = useTelemetryStore(s => s.telemetry[DRONE]);
  const aircraftMission = useAircraftMission(DRONE);

  const [overlap, setOverlap] = useState('70');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const g = tokens.gutter;

  const connected = (mode === 'sim' || mode === 'live') && linked === DRONE;
  const planKey = routeKey(m.waypoints);
  const uploaded = m.uploadedKey !== null && m.uploadedKey === planKey;
  const length = routeLength(m.waypoints);
  const minutes = m.speed > 0 ? length / m.speed / 60 : 0;
  const maxAlt = m.waypoints.reduce((a, w) => Math.max(a, w.alt), 0);
  const selected = m.waypoints.find(w => w.id === m.selectedId) ?? null;
  const selectedIndex = selected ? m.waypoints.indexOf(selected) : -1;

  // ── Pre-flight brief, from what the aircraft actually reports ──────────────
  const checks: PreFlightCheck[] = useMemo(() => {
    const live = connected && telemetry;
    const bat = live ? telemetry!.batteryPercent : null;
    const fix = live ? telemetry!.gpsFixType : null;
    const sats = live ? telemetry!.gpsSatsVisible : null;
    return [
      {
        id: 'link', label: 'Aircraft connected', blocker: true,
        status: connected ? 'pass' : 'fail',
        value: connected ? (mode === 'sim' ? 'Simulator' : 'Live') : mode === 'lost' ? 'Link lost' : 'Not connected',
      },
      {
        id: 'bat', label: 'Battery', blocker: true,
        status: bat === null ? 'checking' : bat >= 30 ? 'pass' : bat >= 20 ? 'warning' : 'fail',
        value: bat === null ? '—' : `${bat}%`,
      },
      {
        id: 'gps', label: 'GPS', blocker: true,
        status: fix === null ? 'checking' : (fix === '3d' || fix === 'rtk') && (sats ?? 0) >= 8 ? 'pass' : 'fail',
        value: fix === null ? '—' : `${fix.toUpperCase()} · ${sats} sats`,
      },
      {
        id: 'mission', label: 'Plan uploaded to aircraft', blocker: true,
        status: m.waypoints.length === 0 ? 'fail' : uploaded ? 'pass' : 'fail',
        value: m.waypoints.length === 0 ? 'No waypoints' : uploaded ? 'Matches plan' : 'Upload the plan',
      },
      // Not integrated, and not hidden: a launch in India needs Digital Sky
      // permission, and nothing here may suggest it has been checked.
      { id: 'airspace', label: 'Airspace permission (Digital Sky)', blocker: false, status: 'warning', value: 'Confirm manually' },
      // No anemometer: say so instead of inventing a reading.
      { id: 'wind', label: 'Wind', blocker: false, status: 'warning', value: 'Not measured' },
    ];
  }, [connected, mode, telemetry?.batteryPercent, telemetry?.gpsFixType, telemetry?.gpsSatsVisible, uploaded, m.waypoints.length]);

  const handleUpload = async () => {
    if (m.waypoints.length === 0) return;
    setUploading(true);
    const result = await uploadMission(m.waypoints.map(({ lat, lng, alt }) => ({ lat, lng, alt })));
    setUploading(false);
    if (result.ok) {
      m.markUploaded();
      setNotice(`Mission accepted by the aircraft: ${m.waypoints.length} waypoints.`);
    } else {
      setNotice(result.error ?? `Upload refused: ${result.result}`);
    }
  };

  // Fill the area outlined by the current waypoints with a survey grid. Line
  // spacing comes from the altitude and the requested image overlap, using an
  // approximate 70-degree camera field of view.
  const handleSurveyGrid = () => {
    if (m.waypoints.length < 3) {
      setNotice('Place at least three waypoints around the area first, then press Survey grid.');
      return;
    }
    const alt = m.defaultAlt;
    const footprint = 2 * alt * Math.tan((35 * Math.PI) / 180);
    const spacing = Math.max(5, footprint * (1 - (parseFloat(overlap) || 70) / 100));
    const grid = generateSurveyGrid(m.waypoints, spacing, alt);
    if (grid.length === 0) {
      setNotice('Could not build a grid inside that area.');
      return;
    }
    m.replace(grid.map(w => ({ lat: w.lat, lng: w.lng, alt: w.altitude })));
    setNotice(`Survey grid: ${grid.length} waypoints, lines ${Math.round(spacing)} m apart.`);
  };

  const handleLaunch = () => {
    navigation.navigate('MissionControl', {
      droneId: DRONE,
      altitude: m.waypoints[0]?.alt ?? m.defaultAlt,
      speed: m.speed,
    });
  };

  const field = (label: string, value: string, onChange: (v: string) => void, last = false) => (
    <View style={[styles.paramInputGroup, last ? null : { marginRight: sp(20) }]}>
      <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.paramInput, { color: theme.textPrimary, borderBottomColor: theme.brand, borderBottomWidth: tokens.rule.medium }]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );

  const params = (
    <View style={styles.paramsRow}>
      {field('NEW WP ALT (m)', String(m.defaultAlt), v => m.setDefaultAlt(Math.max(0, parseInt(v) || 0)))}
      {field('SPEED (m/s)', String(m.speed), v => m.setSpeed(Math.max(0, parseFloat(v) || 0)))}
      {field('OVERLAP %', overlap, setOverlap, true)}
    </View>
  );

  const routeActions = (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={m.clear} style={styles.textLinkBtn}>
        <Text style={[styles.textLink, { color: theme.textSecondary }]}>Clear</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleSurveyGrid}
        style={[styles.secondaryBtn, { borderColor: theme.brand, borderWidth: tokens.rule.hair, backgroundColor: theme.surface }]}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.brand }]}>SURVEY GRID</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleUpload}
        disabled={uploading || m.waypoints.length === 0}
        style={[styles.secondaryBtn, { backgroundColor: uploading ? theme.surfaceMuted : theme.brand, borderColor: theme.brand, borderWidth: tokens.rule.hair }]}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.onBrand }]}>{uploading ? 'UPLOADING…' : 'UPLOAD TO AIRCRAFT'}</Text>
      </TouchableOpacity>
    </View>
  );

  const aircraftLine =
    aircraftMission.status === 'ok'
      ? `Aircraft holds ${aircraftMission.count} waypoints${aircraftMission.simulated ? ' (simulated aircraft)' : ''}.`
      : aircraftMission.status === 'loading' ? 'Reading the aircraft’s mission…'
        : aircraftMission.status === 'error' ? `Could not read the aircraft’s mission: ${aircraftMission.error}`
          : 'No aircraft connected — tap CONNECT in the left panel.';

  return (
    <Page
      title="MISSION PLANNER"
      droneId={DRONE}
      subtitle={
        <View>
          <Text style={[styles.headerSubtitle, { color: headerColors.muted }]}>{DRONE}</Text>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: g, paddingVertical: sp(14), borderBottomWidth: tokens.rule.hair, borderBottomColor: theme.hairline }}>
        <View style={{ flex: 1.5 }}>{params}</View>
        <View style={{ flex: 2, paddingLeft: g }}>{routeActions}</View>
      </View>

      <View style={{ paddingHorizontal: g, paddingVertical: sp(8), backgroundColor: uploaded ? theme.statusGreenMuted : theme.accentAmberMuted, borderBottomWidth: tokens.rule.hair, borderBottomColor: theme.hairline }}>
        <Text style={{ fontFamily: typography.fonts.semiBold, fontSize: 13, color: uploaded ? theme.statusGreen : theme.accentAmber }}>
          {uploaded ? 'The aircraft holds this plan. ' : m.waypoints.length ? 'This plan is not on the aircraft yet — upload it before launch. ' : 'Click the map to place waypoints. '}
          {aircraftLine}
        </Text>
      </View>

      <View style={styles.mapSlot}>
        <GeoMap
          editable
          waypoints={m.waypoints}
          selectedId={m.selectedId}
          onAdd={m.add}
          onMove={m.move}
          onSelect={m.select}
          aircraft={connected && telemetry ? { lat: telemetry.lat, lng: telemetry.lng, heading: telemetry.heading } : null}
          label="CLICK TO ADD · DRAG TO MOVE · TAP TO EDIT"
        />

        <View style={[styles.stats, { backgroundColor: theme.overlayHeavy }]} pointerEvents="none">
          <Text style={styles.statsText}>
            {m.waypoints.length} WP · {(length / 1000).toFixed(2)} km · ~{Math.max(1, Math.round(minutes))} min · max {Math.round(maxAlt)} m
          </Text>
        </View>

        {selected ? (
          <View style={[styles.editor, { backgroundColor: theme.background, borderColor: theme.brand }]}>
            <Text style={[styles.editorTitle, { color: theme.textPrimary }]}>WAYPOINT {selectedIndex + 1}</Text>
            <Text style={[styles.paramLabel, { color: theme.textSecondary, marginTop: 8 }]}>ALTITUDE (m)</Text>
            <TextInput
              style={[styles.paramInput, { color: theme.textPrimary, borderBottomColor: theme.brand, borderBottomWidth: tokens.rule.medium }]}
              value={String(selected.alt)}
              onChangeText={v => m.setAlt(selected.id, Math.max(0, Math.min(120, parseInt(v) || 0)))}
              keyboardType="numeric"
            />
            <Text style={[styles.coords, { color: theme.textSecondary }]}>
              {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity onPress={() => m.remove(selected.id)} style={[styles.smallBtn, { borderColor: theme.accentRed }]}>
                <Text style={[styles.smallBtnText, { color: theme.accentRed }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => m.select(null)} style={[styles.smallBtn, { borderColor: theme.hairline, marginLeft: 8 }]}>
                <Text style={[styles.smallBtnText, { color: theme.textPrimary }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <Rule weight="thick" />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: g, paddingTop: sp(10), paddingBottom: insets.bottom + sp(12) }}>
        <View style={{ flex: 2.4, paddingRight: g }}>
          <PreFlightChecklist checks={checks} onLaunch={handleLaunch} part="checks" />
        </View>
        <VRule />
        <View style={{ flex: 1, paddingLeft: g }}>
          <PreFlightChecklist checks={checks} onLaunch={handleLaunch} part="launch" />
        </View>
      </View>

      <Snackbar visible={notice !== null} onDismiss={() => setNotice(null)} duration={6000}
        action={{ label: 'Dismiss', onPress: () => setNotice(null) }}>
        {notice ?? ''}
      </Snackbar>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerSubtitle: { fontFamily: typography.fonts.semiBold, fontSize: 11, letterSpacing: 1.2, lineHeight: 19 },
  mapSlot: { flex: 1, position: 'relative', minHeight: 260 },
  paramsRow: { flexDirection: 'row' },
  paramInputGroup: { flex: 1 },
  paramLabel: { fontFamily: typography.fonts.bold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  paramInput: { paddingVertical: 5, fontFamily: typography.fonts.medium, fontSize: typography.sizes.sm, fontVariant: typography.tabularNums, outlineStyle: 'none' } as any,
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  textLinkBtn: { paddingVertical: 10, paddingRight: 8 },
  textLink: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.sm, textDecorationLine: 'underline' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  secondaryBtnText: { fontFamily: typography.fonts.bold, fontSize: 12, letterSpacing: 1.1 },
  stats: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 6, zIndex: 600 },
  statsText: { color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 11, letterSpacing: 0.6 },
  editor: { position: 'absolute', left: 12, bottom: 12, width: 220, padding: 14, borderWidth: 1, zIndex: 700 },
  editorTitle: { fontFamily: typography.fonts.bold, fontSize: 13, letterSpacing: 1 },
  coords: { fontFamily: typography.fonts.regular, fontSize: 11, marginTop: 6, fontVariant: ['tabular-nums'] },
  smallBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  smallBtnText: { fontFamily: typography.fonts.semiBold, fontSize: 12 },
});
