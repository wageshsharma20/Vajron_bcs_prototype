import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Pause, Play, DownloadCloud, AlertTriangle } from 'lucide-react-native';

import { typography } from '../theme';
import { useTelemetry } from '../hooks/useTelemetry';
import { telemetryService } from '../services/telemetryService';
import TelemetryHUD from '../components/TelemetryHUD';
import VideoFeedPlayer from '../components/VideoFeedPlayer';
import GimbalControlPad from '../components/GimbalControlPad';
import MissionProgressBar from '../components/MissionProgressBar';
import NotificationBanner from '../components/NotificationBanner';
import { DroneAlert, TelemetryFrame } from '../data/types';

const silverMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
];

export default function MissionControlScreen({ route }: any) {
  const droneId = route.params?.droneId || 'DRONE-01'; // Fallback for direct tab click
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const telemetry = useTelemetry(droneId);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {alert && (
        <NotificationBanner 
          message={alert.message}
          type={alert.severity === 'critical' ? 'error' : 'warning'}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Command Strip */}
      <View style={[styles.commandStrip, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.droneInfo}>
          <Text style={[styles.droneId, { color: theme.colors.textPrimary }]}>{droneId}</Text>
          <Text style={[styles.droneStatus, { color: theme.colors.textSecondary }]}>
            {telemetry?.flightMode?.toUpperCase() || 'UNKNOWN'} · {telemetry?.gpsFixType?.toUpperCase() || 'NO'} FIX
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceLight }]} onPress={handlePauseToggle}>
            {isPaused ? <Play size={18} color={theme.colors.accentAmber} /> : <Pause size={18} color={theme.colors.accentAmber} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.accentRed }]} onPress={handleRTL}>
            <DownloadCloud size={18} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF', marginLeft: 4 }]}>RTL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          customMapStyle={silverMapStyle}
          initialRegion={{
            latitude: 28.535517,
            longitude: 77.191632,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={telemetry ? {
            latitude: telemetry.lat,
            longitude: telemetry.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : undefined}
        >
          {flightPath.length > 0 && (
            <Polyline
              coordinates={flightPath}
              strokeColor={theme.colors.accentAmber}
              strokeWidth={3}
            />
          )}
          {telemetry && (
            <Marker
              coordinate={{ latitude: telemetry.lat, longitude: telemetry.lng }}
              rotation={telemetry.heading}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.droneMarker}>
                <View style={[styles.droneArrow, { borderBottomColor: theme.colors.textPrimary }]} />
              </View>
            </Marker>
          )}
        </MapView>
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
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: -0.3,
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
