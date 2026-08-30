import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { Pause, Play, DownloadCloud, UploadCloud } from 'lucide-react-native';

import { useTelemetry } from '../hooks/useTelemetry';
import { typography } from '../theme';
import { telemetryService } from '../services/telemetryService';
import { useTelemetryStore } from '../data/useTelemetryStore';
import TelemetryHUD from '../components/TelemetryHUD';
import VideoFeedPlayer from '../components/VideoFeedPlayer';
import MissionMapView from '../components/MissionMapView';
import { useMissionPlayback } from '../hooks/useMissionPlayback';
import { FLIGHT_WAYPOINTS } from '../data/flightWaypoints';
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

  // The picture: camera feed and map, side by side.
  //
  // The row takes only the height its two frames need. It used to be flex:1,
  // which handed it 437pt for a 199pt feed and left ~180pt of white above and
  // below — the frames are ratio-locked, so a taller slot buys nothing but
  // empty space. Sizing the row to its content instead gives that height back
  // to the readouts, and lets the feed take the larger share of the width.
  const media = (
    <View style={[styles.media, { padding: tokens.gutter }]}>
      <View style={{ flex: tokens.mediaSplit.feed, paddingRight: tokens.gutter }}>
        <VideoFeedPlayer telemetry={telemetry} player={feedPlayer} isArmed={isArmed} />
      </View>
      <View style={{ flex: tokens.mediaSplit.map }}>
        <MissionMapView player={mapPlayer} isArmed={isArmed} progress={missionProgress} />
      </View>
    </View>
  );

  const telemetryGrid = <TelemetryHUD telemetry={telemetry} isGrid={true} />;

  const gimbal = (
    <GimbalControlPad 
      onPanTilt={(p, y) => telemetryService.sendGimbalCommand(droneId, { pitch: p, yaw: y })}
      onZoom={(z) => telemetryService.sendGimbalCommand(droneId, { zoomLevel: z })}
      onPhoto={() => telemetryService.sendGimbalCommand(droneId, { isPhotoMode: true })}
      onRecordToggle={() => telemetryService.sendGimbalCommand(droneId, { isRecording: true })}
    />
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
          the top of the picture below it. */}
      <View
        style={[
          styles.commandStrip,
          {
            borderBottomColor: theme.hairline,
            borderBottomWidth: tokens.rule.hair,
            paddingHorizontal: tokens.gutter,
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

      {media}

      {/* A thick rule divides what the aircraft is seeing from what it is
          reporting. It is the strongest line on the screen because that is the
          biggest change of subject on it. */}
      <Rule weight="thick" color={theme.textPrimary} />

      <View style={[styles.readouts, { paddingHorizontal: tokens.gutter }]}>
        {/* Centred in the space between the picture and the progress footer.
            Two ratio-locked frames and a six-cell table do not fill a display
            this tall, and the leftover reads as considered when it sits evenly
            above and below the readings rather than pooling under them. */}
        <View style={styles.controlsRow}>
          <View style={[styles.telemetryWrapper, { paddingRight: tokens.gutter }]}>{telemetryGrid}</View>
          {/* The readings and the camera controls are different kinds of thing,
              so a rule between them rather than a gap. */}
          <VRule />
          <View style={[styles.gimbalWrapper, { paddingLeft: tokens.gutter }]}>{gimbal}</View>
        </View>

        {/* Mission progress is the page's footer: pinned to the bottom of the
            readouts so it reads as the state of the whole sortie rather than as
            one more reading among the six above it. */}
        <View
          style={{
            marginTop: 'auto',
            paddingTop: sp(16),
            paddingBottom: sp(16),
            borderTopWidth: tokens.rule.hair,
            borderTopColor: theme.hairline,
          }}
        >
          <MissionProgressBar totalWaypoints={TOTAL_WAYPOINTS} currentWaypoint={currentWaypoint} />
        </View>
      </View>
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
  media: {
    flexDirection: 'row',
    // Height comes from the frames, not from what is left over on the page.
    alignItems: 'flex-start',
  },
  readouts: {
    flex: 1,
  },
  controlsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gimbalWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  telemetryWrapper: {
    flex: 2.2,
  },
});
