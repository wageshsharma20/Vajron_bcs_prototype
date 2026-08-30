import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { Pause, Play, DownloadCloud, UploadCloud } from 'lucide-react-native';

import { useTelemetry } from '../hooks/useTelemetry';
import { typography } from '../theme';
import { telemetryService } from '../services/telemetryService';
import { useTelemetryStore } from '../data/useTelemetryStore';
import TelemetryHUD from '../components/TelemetryHUD';
import VideoFeedPlayer, { FEED_ASPECT } from '../components/VideoFeedPlayer';
import MissionMapView from '../components/MissionMapView';
import { useMissionPlayback } from '../hooks/useMissionPlayback';
import { FLIGHT_WAYPOINTS, MAP_FRAME_ASPECT } from '../data/flightWaypoints';
import { Page, useHeaderColors, Rule, VRule } from '../components/Chrome';

const TOTAL_WAYPOINTS = FLIGHT_WAYPOINTS.length;
import GimbalControlPad from '../components/GimbalControlPad';
import MissionProgressBar from '../components/MissionProgressBar';
import ConfirmActionDialog from '../components/ConfirmActionDialog';

export default function MissionControlScreen({ route }: any) {
  const droneId = route.params?.droneId || 'DRONE-01'; // Fallback for direct tab click
  const { theme, tokens, sp } = useTheme();
  const headerColors = useHeaderColors();
  
  const telemetry = useTelemetry(droneId);
  const updateGimbal = useTelemetryStore(state => state.updateGimbal);

  const [flightPath, setFlightPath] = useState<{ latitude: number, longitude: number }[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [takeOffDialogVisible, setTakeOffDialogVisible] = useState(false);
  const [rtlDialogVisible, setRtlDialogVisible] = useState(false);

  useEffect(() => {
    // Accumulate flight path for polyline
    if (telemetry) {
      setFlightPath(prev => {
        const newPath = [...prev, { latitude: telemetry.lat, longitude: telemetry.lng }];
        if (newPath.length > 500) newPath.shift(); // cap to prevent memory bloat
        return newPath;
      });
    }
  }, [telemetry]);

  // The camera feed and the map recording are the same sortie, so one hook owns
  // both and keeps them aligned; take-off starts them and RTL rewinds them.
  const isArmed = !!telemetry?.isArmed;
  const { feedPlayer, mapPlayer, progress: missionFraction } = useMissionPlayback(isArmed, isPaused);

  // One progress figure for the whole screen, read off the recordings.
  //
  // It previously came from the telemetry path (flightPath.length / 200). That
  // loop runs at 10 Hz, so it completed in about 20 seconds while the sortie it
  // represents is 124 — the route finished and every waypoint lit while the
  // aircraft was still visibly outbound on the feed.
  const currentWaypoint = Math.round(missionFraction * TOTAL_WAYPOINTS);
  const missionProgress = isArmed ? missionFraction : undefined;

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    telemetryService.sendCommand(droneId, isPaused ? 'resume' : 'hold');
  };

  const handleTakeOffConfirm = () => {
    setTakeOffDialogVisible(false);
    telemetryService.sendCommand(droneId, 'takeoff');
  };

  const handleRtlConfirm = () => {
    setRtlDialogVisible(false);
    
    // Simulate RTL returning and resetting everything to Time 0
    telemetryService.resetReplay(droneId);
    useTelemetryStore.getState().resetTelemetry(droneId);
    setFlightPath([]);
    setIsPaused(false);
  };

  // ── The pieces ────────────────────────────────────────────────────────────
  // Every arrangement below is built from exactly these five, resized and
  // repositioned. Nothing is added or dropped between them.

  const feed = <VideoFeedPlayer telemetry={telemetry} player={feedPlayer} isArmed={isArmed} />;
  const map = <MissionMapView player={mapPlayer} isArmed={isArmed} progress={missionProgress} />;
  const readings = (columns: number) => (
    <TelemetryHUD telemetry={telemetry} isGrid={true} columns={columns} />
  );
  const camera = (
    <GimbalControlPad 
      onPanTilt={(p, y) => telemetryService.sendGimbalCommand(droneId, { pitch: p, yaw: y })}
      onZoom={(z) => telemetryService.sendGimbalCommand(droneId, { zoomLevel: z })}
      onPhoto={() => telemetryService.sendGimbalCommand(droneId, { isPhotoMode: true })}
      onRecordToggle={() => telemetryService.sendGimbalCommand(droneId, { isRecording: true })}
    />
  );
  const progress = (
    <MissionProgressBar totalWaypoints={TOTAL_WAYPOINTS} currentWaypoint={currentWaypoint} />
  );

  const g = tokens.gutter;

  /** Mission progress as a footer: ruled off, pinned to the foot of the page. */
  const progressFooter = () => (
    <View
      style={{
        marginTop: 'auto',
        paddingHorizontal: g,
        paddingTop: sp(14),
        paddingBottom: sp(16),
        borderTopWidth: tokens.rule.hair,
        borderTopColor: theme.hairline,
      }}
    >
      {progress}
    </View>
  );

  /**
   * A panel sized from its own width by the source's ratio.
   *
   * The feed and the map are ratio-locked recordings, so a slot taller than
   * their ratio allows buys nothing but white space. Driving height from width
   * is what keeps these arrangements free of it.
   *
   * `flexShrink` is what stops that becoming a liability on a short display:
   * the box gives up height when the page cannot afford its full ratio, and
   * because the frame inside is measured rather than declared, it re-fits to
   * whatever it is given instead of being clipped.
   */
  const ratioBox = (aspect: number, children: React.ReactNode, style?: any) => (
    <View style={[{ width: '100%', aspectRatio: aspect, flexShrink: 1 }, style]}>{children}</View>
  );

  return (
    <Page
      title={droneId}
      subtitle={
        <Text style={[styles.droneStatus, { color: headerColors.muted }]}>
          {telemetry?.flightMode?.toUpperCase() || 'UNKNOWN'} · {telemetry?.gpsFixType?.toUpperCase() || 'NO'} FIX
        </Text>
      }
    >
      {/* The command bar is its own band, closed by a rule: it holds the only
          controls on the screen that commit anything, so it must not read as
          the top of the picture below it. It stays put across every
          arrangement — the thing being varied is the picture, not the
          controls that commit a flight. */}
      <View
        style={[
          styles.commandStrip,
          {
            borderBottomColor: theme.hairline,
            borderBottomWidth: tokens.rule.hair,
            paddingHorizontal: g,
            paddingVertical: sp(12),
          },
        ]}
      >
        <View style={styles.actionsRow}>
          {!telemetry?.isArmed ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.statusGreen, paddingHorizontal: sp(24), paddingVertical: sp(12) }]} onPress={() => setTakeOffDialogVisible(true)}>
              <UploadCloud size={18} color="#FFFFFF" strokeWidth={1.4} />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 8 }]}>TAKE OFF</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.actionBtn, { paddingHorizontal: sp(24), paddingVertical: sp(12), borderWidth: tokens.rule.hair, borderColor: theme.hairline }]} onPress={handlePauseToggle}>
                {isPaused ? <Play size={18} color={theme.textPrimary} strokeWidth={1.4} /> : <Pause size={18} color={theme.textPrimary} strokeWidth={1.4} />}
                <Text style={[styles.actionBtnText, { color: theme.textPrimary, marginLeft: 8 }]}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accentRed, paddingHorizontal: sp(24), paddingVertical: sp(12) }]} onPress={() => setRtlDialogVisible(true)}>
                <DownloadCloud size={18} color="#FFFFFF" strokeWidth={1.4} />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 8 }]}>RTL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ConfirmActionDialog
        visible={takeOffDialogVisible}
        title="Confirm Take Off"
        message={`${droneId} will arm and climb to launch altitude. Make sure the area is clear.`}
        confirmLabel="Confirm Take Off"
        onConfirm={handleTakeOffConfirm}
        onCancel={() => setTakeOffDialogVisible(false)}
      />

      <ConfirmActionDialog
        visible={rtlDialogVisible}
        title="Confirm Return-to-Launch"
        message={`${droneId} will abort its current mission and return to the home point.`}
        confirmLabel="Confirm RTL"
        destructive={true}
        onConfirm={handleRtlConfirm}
        onCancel={() => setRtlDialogVisible(false)}
      />

      {/* The feed takes the full width of the working area — the largest it can
          be without stacking — and everything else becomes three ruled columns
          under it, read left to right in the order the operator needs them. */}
      <View style={{ padding: g, flexShrink: 1 }}>{ratioBox(FEED_ASPECT, feed)}</View>

      {/* A thick rule divides what the aircraft is seeing from what it is
          reporting. It is the strongest line on the screen because that is the
          biggest change of subject on it. */}
      <Rule weight="thick" color={theme.textPrimary} />

      {/* minHeight is what stops the feed above crushing these columns: the feed
          asks for its full ratio height first, and flex would otherwise settle
          the shortfall entirely out of this row. */}
      <View style={{ flex: 1, minHeight: 132, flexDirection: 'row', paddingHorizontal: g, paddingTop: sp(18) }}>
        <View style={{ flex: 1.1, paddingRight: g }}>{map}</View>
        <VRule />
        <View style={{ flex: 1.6, paddingHorizontal: g, justifyContent: 'center' }}>
          {readings(3)}
        </View>
        <VRule />
        <View style={{ flex: 1, paddingLeft: g, justifyContent: 'center' }}>{camera}</View>
      </View>

      {progressFooter()}
    </Page>
  );
}

const styles = StyleSheet.create({
  commandStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  droneStatus: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    letterSpacing: 1.1,
  },
});
