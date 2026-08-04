import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
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
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      <View style={styles.joystickContainer}>
        <MockJoystick
          color={theme.colors.accentAmber}
          radius={50}
        />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.zoomRow}>
          <TouchableOpacity style={[styles.zoomBtn, { borderColor: theme.colors.border }]} onPress={() => adjustZoom(-1)}>
            <Text style={[styles.zoomBtnText, { color: theme.colors.textPrimary }]}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.zoomText, { color: theme.colors.textPrimary }]}>{zoom}x</Text>
          <TouchableOpacity style={[styles.zoomBtn, { borderColor: theme.colors.border }]} onPress={() => adjustZoom(1)}>
            <Text style={[styles.zoomBtnText, { color: theme.colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceLight }]} onPress={onPhoto}>
            <Camera size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isRecording ? theme.colors.accentRed : theme.colors.surfaceLight }]} onPress={handleRecord}>
            <Video size={20} color={isRecording ? '#FFF' : theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joystickContainer: {
    width: 120,
    alignItems: 'center',
  },
  controlsContainer: {
    flex: 1,
    paddingLeft: 24,
    justifyContent: 'space-between',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontFamily: typography.fonts.regular,
    fontSize: 20,
    marginTop: -2,
  },
  zoomText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  }
});
