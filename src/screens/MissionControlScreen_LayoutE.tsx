import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
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
import { PageHeader, useHeaderColors, Rule } from '../components/Chrome';

const TOTAL_WAYPOINTS = FLIGHT_WAYPOINTS.length;
import GimbalControlPad from '../components/GimbalControlPad';
import MissionProgressBar from '../components/MissionProgressBar';
import ConfirmActionDialog from '../components/ConfirmActionDialog';
import { DroneAlert, TelemetryFrame } from '../data/types';

export default function MissionControlScreen({ route }: any) {
  const droneId = route.params?.droneId || 'DRONE-01'; // Fallback for direct tab click
  const { theme, tokens, sp } = useTheme();
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      <ConfirmActionDialog visible={takeOffDialogVisible} title="Confirm Take Off" message={`${droneId} will arm and climb.`} confirmLabel="Confirm" onConfirm={handleTakeOffConfirm} onCancel={() => setTakeOffDialogVisible(false)} />
      <ConfirmActionDialog visible={rtlDialogVisible} title="Confirm RTL" message={`${droneId} will abort.`} confirmLabel="Confirm" destructive={true} onConfirm={handleRtlConfirm} onCancel={() => setRtlDialogVisible(false)} />

      <PageHeader title={droneId} subtitle={<Text style={[styles.droneStatus, { color: headerColors.muted }]}>{telemetry?.flightMode?.toUpperCase()}</Text>} />
      
      <View style={{ padding: tokens.gutter, backgroundColor: theme.surface, borderBottomWidth: tokens.rule.medium, borderBottomColor: theme.textPrimary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: tokens.gutter }}><MissionProgressBar totalWaypoints={TOTAL_WAYPOINTS} currentWaypoint={currentWaypoint} /></View>
        
        <View style={styles.actionsRow}>
          {!telemetry?.isArmed ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.statusGreen, paddingHorizontal: sp(22), paddingVertical: sp(11) }]} onPress={() => setTakeOffDialogVisible(true)}><UploadCloud size={22} color="#FFFFFF" /><Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 6 }]}>TAKE OFF</Text></TouchableOpacity>
          ) : (
            <><TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, paddingHorizontal: sp(22), paddingVertical: sp(11), borderWidth: tokens.rule.hair, borderColor: theme.hairline }]} onPress={handlePauseToggle}>{isPaused ? <Play size={22} color={theme.accentAmber} /> : <Pause size={22} color={theme.accentAmber} />}<Text style={[styles.actionBtnText, { color: theme.accentAmber, marginLeft: 6 }]}>{isPaused ? 'RESUME' : 'PAUSE'}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accentRed, paddingHorizontal: sp(22), paddingVertical: sp(11) }]} onPress={() => setRtlDialogVisible(true)}><DownloadCloud size={22} color="#FFFFFF" /><Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 6 }]}>RTL</Text></TouchableOpacity></>
          )}
        </View>

      </View>

      <View style={{ padding: tokens.gutter, height: 400 }}>
        <VideoFeedPlayer telemetry={telemetry} player={feedPlayer} isArmed={isArmed} />
      </View>

      <Rule weight="thin" color={theme.hairline} />

      <View style={{ padding: tokens.gutter, height: 400 }}>
        <MissionMapView player={mapPlayer} isArmed={isArmed} progress={missionProgress} />
      </View>
      
      <Rule weight="thin" color={theme.hairline} />

      <View style={{ padding: tokens.gutter, minHeight: 300 }}>
        <TelemetryHUD telemetry={telemetry} isGrid={true} />
      </View>

      <Rule weight="thin" color={theme.hairline} />

      <View style={{ padding: tokens.gutter, paddingBottom: 100, alignItems: 'center' }}>
        <View style={{ width: 400 }}><GimbalControlPad onPanTilt={(p, y) => telemetryService.sendGimbalCommand(droneId, { pitch: p, yaw: y })} onZoom={(z) => telemetryService.sendGimbalCommand(droneId, { zoomLevel: z })} onPhoto={() => telemetryService.sendGimbalCommand(droneId, { isPhotoMode: true })} onRecordToggle={() => telemetryService.sendGimbalCommand(droneId, { isRecording: true })} /></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, width: '100%', backgroundColor: '#FFFFFF' },
  droneStatus: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.xs, letterSpacing: 0.5, marginTop: 2 },
  actionsRow: { flexDirection: 'row' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionBtnText: { fontFamily: typography.fonts.bold, fontSize: typography.sizes.xs },

});
