import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, DownloadCloud, AlertTriangle, MapPin, UploadCloud } from 'lucide-react-native';

import { useTelemetry } from '../hooks/useTelemetry';
import { typography } from '../theme';
import { telemetryService } from '../services/telemetryService';
import { useTelemetryStore } from '../data/useTelemetryStore';
import TelemetryHUD from '../components/TelemetryHUD';
import VideoFeedPlayer from '../components/VideoFeedPlayer';
import MissionMapView from '../components/MissionMapView';
import { useMissionPlayback } from '../hooks/useMissionPlayback';
import { FLIGHT_WAYPOINTS } from '../data/flightWaypoints';
import { PageHeader, useHeaderColors } from '../components/Chrome';

const TOTAL_WAYPOINTS = FLIGHT_WAYPOINTS.length;
import GimbalControlPad from '../components/GimbalControlPad';
import MissionProgressBar from '../components/MissionProgressBar';
import ConfirmActionDialog from '../components/ConfirmActionDialog';
import { DroneAlert, TelemetryFrame } from '../data/types';

export default function MissionControlScreen({ route }: any) {
  const droneId = route.params?.droneId || 'DRONE-01'; // Fallback for direct tab click
  const { theme, tokens } = useTheme();
  const headerColors = useHeaderColors();
  const insets = useSafeAreaInsets();
  
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Masthead carries the aircraft and its mode; the command row sits on the
          page beneath it so the controls are on a stable light surface. */}
      <PageHeader
        title={droneId}
        subtitle={
          <Text style={[styles.droneStatus, { color: headerColors.muted }]}>
            {telemetry?.flightMode?.toUpperCase() || 'UNKNOWN'} · {telemetry?.gpsFixType?.toUpperCase() || 'NO'} FIX
          </Text>
        }
      />

      <View style={[styles.commandStrip, { borderBottomColor: theme.hairline, backgroundColor: theme.surface }]}>
        <View style={styles.actionsRow}>
          {!telemetry?.isArmed ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.statusGreen, borderRadius: tokens.radius.sm, paddingHorizontal: 16 }]} onPress={() => setTakeOffDialogVisible(true)}>
              <UploadCloud size={22} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 6 }]}>TAKE OFF</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, borderRadius: tokens.radius.sm, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline }]} onPress={handlePauseToggle}>
                {isPaused ? <Play size={22} color={theme.accentAmber} /> : <Pause size={22} color={theme.accentAmber} />}
                <Text style={[styles.actionBtnText, { color: theme.accentAmber, marginLeft: 6 }]}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accentRed, borderRadius: tokens.radius.sm, paddingHorizontal: 16 }]} onPress={() => setRtlDialogVisible(true)}>
                <DownloadCloud size={22} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 6 }]}>RTL</Text>
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

      <View style={styles.mainContent}>
        {/* Top Section: Video (Left) + Map (Right) */}
        <View style={styles.topRow}>
          <View style={styles.videoColumn}>
            <View style={styles.videoFeedWrapper}>
              <VideoFeedPlayer telemetry={telemetry} player={feedPlayer} isArmed={isArmed} />
            </View>
          </View>
          <View style={styles.mapColumn}>
            <View style={styles.mapContainerSquare}>
              <MissionMapView player={mapPlayer} isArmed={isArmed} progress={missionProgress} />
            </View>
          </View>
        </View>

        {/* Bottom Section: Controls & Telemetry */}
        <View style={styles.bottomSection}>
          <View style={styles.controlsRow}>
            <View style={styles.telemetryWrapper}>
              <TelemetryHUD telemetry={telemetry} isGrid={true} />
            </View>
            <View style={styles.gimbalWrapper}>
              <GimbalControlPad 
                onPanTilt={(p, y) => telemetryService.sendGimbalCommand(droneId, { pitch: p, yaw: y })}
                onZoom={(z) => telemetryService.sendGimbalCommand(droneId, { zoomLevel: z })}
                onPhoto={() => telemetryService.sendGimbalCommand(droneId, { isPhotoMode: true })}
                onRecordToggle={() => telemetryService.sendGimbalCommand(droneId, { isRecording: true })}
              />
            </View>
          </View>
          <View style={styles.progressWrapper}>
            <MissionProgressBar totalWaypoints={TOTAL_WAYPOINTS} currentWaypoint={currentWaypoint} />
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
  mainContent: {
    flex: 1,
    paddingBottom: 16,
  },
  commandStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  droneInfo: {
    flex: 1,
  },
  droneId: {
    fontFamily: typography.fonts.light,
    fontSize: 31,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  droneStatus: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
  },
  topRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  videoColumn: {
    // Was 2.2 : 1, which left the feed oversized against its own 832x384 source
    // and the map cramped beside it. Both panels are now framed to their source
    // ratios, so this split is just how the width is shared between them.
    flex: 1,
    paddingRight: 16,
  },
  mapColumn: {
    flex: 1.1,
  },
  videoFeedWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapContainerSquare: {
    // Border, radius and centring now live on MissionMapView, which fills this
    // slot — keeping them here too would double the border and inset the frame
    // the waypoint overlay is positioned against.
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gimbalWrapper: {
    flex: 1,
  },
  telemetryWrapper: {
    flex: 2.2,
    paddingRight: 16,
  },
  progressWrapper: {
    marginTop: 16,
  },
});
