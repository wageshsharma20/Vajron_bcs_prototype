import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { Camera, Video } from 'lucide-react-native';
import { typography } from '../theme';

interface GimbalControlPadProps {
  onPanTilt: (pitch: number, yaw: number) => void;
  onZoom: (zoomLevel: number) => void;
  onPhoto: () => void;
  onRecordToggle: () => void;
}

// Mock Joystick to prevent crashes since 'react-native-joystick' doesn't export <Joystick>
const MockJoystick = ({ color, radius }: { color: string, radius: number }) => (
  <View style={{
    width: radius * 2,
    height: radius * 2,
    borderRadius: radius,
    backgroundColor: color + '40', // 25% opacity
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: color
  }}>
    <View style={{
      width: radius * 0.8,
      height: radius * 0.8,
      borderRadius: radius * 0.4,
      backgroundColor: color
    }} />
  </View>
);

export default function GimbalControlPad({ onPanTilt, onZoom, onPhoto, onRecordToggle }: GimbalControlPadProps) {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleJoystick = (data: any) => {
    // data contains type: 'move' | 'stop', position: { x, y }, force, angle
    if (data.type === 'move') {
      const yawRate = (data.position.x / 50); 
      const pitchRate = -(data.position.y / 50);
      onPanTilt(pitchRate, yawRate);
    } else if (data.type === 'stop') {
      onPanTilt(0, 0);
    }
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    onRecordToggle();
  };

  const adjustZoom = (delta: number) => {
    const newZoom = Math.max(1, Math.min(30, zoom + delta));
    setZoom(newZoom);
    onZoom(newZoom);
  };

  return (
    <View style={styles.outerContainer}>
      <Text style={[styles.panelTitle, { color: theme.textSecondary }]}>CAMERA CONTROLS</Text>
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <View style={styles.singleRow}>
          
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceLight }]} onPress={onPhoto}>
            <Camera size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.zoomRow}>
            <TouchableOpacity style={[styles.zoomBtn, { borderColor: theme.hairline }]} onPress={() => adjustZoom(-1)}>
              <Text style={[styles.zoomBtnText, { color: theme.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: theme.textPrimary }]}>{zoom}x</Text>
            <TouchableOpacity style={[styles.zoomBtn, { borderColor: theme.hairline }]} onPress={() => adjustZoom(1)}>
              <Text style={[styles.zoomBtnText, { color: theme.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isRecording ? theme.accentRed : theme.surfaceLight }]} onPress={handleRecord}>
            <View style={[styles.recordCircle, { backgroundColor: isRecording ? '#FFF' : theme.accentRed }]} />
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  panelTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  singleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  zoomBtnText: {
    fontFamily: typography.fonts.regular,
    fontSize: 18,
    marginTop: -2,
  },
  zoomText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    width: 28,
    textAlign: 'center',
  },
  actionBtn: {
    width: 44,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  }
});
