import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, DownloadCloud, AlertTriangle, MapPin } from 'lucide-react-native';

import { useTelemetry } from '../hooks/useTelemetry';
import { typography } from '../theme';
import { telemetryService } from '../services/telemetryService';
import { useTelemetryStore } from '../data/useTelemetryStore';
import TelemetryHUD from '../components/TelemetryHUD';
import VideoFeedPlayer from '../components/VideoFeedPlayer';
import GimbalControlPad from '../components/GimbalControlPad';
import MissionProgressBar from '../components/MissionProgressBar';
import NotificationBanner from '../components/NotificationBanner';
import { DroneAlert, TelemetryFrame } from '../data/types';

export default function MissionControlScreen({ route }: any) {
  const droneId = route.params?.droneId || 'DRONE-01'; // Fallback for direct tab click
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const telemetry = useTelemetry(droneId);
  const updateGimbal = useTelemetryStore(state => state.updateGimbal);

  const [flightPath, setFlightPath] = useState<{ latitude: number, longitude: number }[]>([]);
  const [alert, setAlert] = useState<DroneAlert | null>(null);
  const [isPaused, setIsPaused] = useState(false);

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

  useEffect(() => {
    const unsubscribe = telemetryService.subscribeAlerts((newAlert) => {
      if (newAlert.droneId === droneId) {
        setAlert(newAlert);
        // auto dismiss after 5s
        setTimeout(() => setAlert(null), 5000);
      }
    });
    return unsubscribe;
  }, [droneId]);

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    telemetryService.sendCommand(droneId, isPaused ? 'resume' : 'hold');
  };

  const handleRTL = () => {
    telemetryService.sendCommand(droneId, 'rtl');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {alert && (
        <NotificationBanner 
          message={alert.message}
          type={alert.severity === 'critical' ? 'error' : 'warning'}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Command Strip */}
      <View style={[styles.commandStrip, { borderBottomColor: theme.hairline }]}>
        <View style={styles.droneInfo}>
          <Text style={[styles.droneId, { color: theme.textPrimary }]}>{droneId}</Text>
          <Text style={[styles.droneStatus, { color: theme.textSecondary }]}>
            {telemetry?.flightMode?.toUpperCase() || 'UNKNOWN'} · {telemetry?.gpsFixType?.toUpperCase() || 'NO'} FIX
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted }]} onPress={handlePauseToggle}>
            {isPaused ? <Play size={18} color={theme.accentAmber} /> : <Pause size={18} color={theme.accentAmber} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accentRed }]} onPress={handleRTL}>
            <DownloadCloud size={18} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 4 }]}>RTL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Map */}
      <View style={[styles.mapContainer, { backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }]}>
        <MapPin size={24} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
        <Text style={{ fontFamily: typography.fonts.medium, color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', fontSize: typography.sizes.xs }}>Map View</Text>
      </View>

      {/* Telemetry Strip */}
      <TelemetryHUD telemetry={telemetry} />
      
      {/* Progress */}
      <MissionProgressBar totalWaypoints={20} currentWaypoint={Math.floor((flightPath.length / 200) * 20)} />

      {/* Video Feed */}
      <VideoFeedPlayer telemetry={telemetry} />

      {/* Gimbal Controls */}
      <GimbalControlPad 
        onPanTilt={(p, y) => telemetryService.sendGimbalCommand(droneId, { pitch: p, yaw: y })}
        onZoom={(z) => telemetryService.sendGimbalCommand(droneId, { zoomLevel: z })}
        onPhoto={() => telemetryService.sendGimbalCommand(droneId, { isPhotoMode: true })}
        onRecordToggle={() => telemetryService.sendGimbalCommand(droneId, { isRecording: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  commandStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  droneInfo: {
    flex: 1,
  },
  droneId: {
    fontFamily: typography.fonts.light,
    fontSize: 22,
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
  mapContainer: {
    flex: 1, // Takes remaining space
    minHeight: 150,
  },
  droneMarker: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  droneArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  }
});
