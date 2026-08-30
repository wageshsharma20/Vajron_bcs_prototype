import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { Camera, Minus, Plus } from 'lucide-react-native';
import { typography } from '../theme';

interface GimbalControlPadProps {
  /**
   * Not driven by anything on this pad. The joystick that would have called it
   * was a placeholder — react-native-joystick does not export the component it
   * was written against — and has been removed. The prop stays because slewing
   * is a real gimbal capability the pad will need, but nothing here slews yet.
   */
  onPanTilt: (pitch: number, yaw: number) => void;
  onZoom: (zoomLevel: number) => void;
  onPhoto: () => void;
  onRecordToggle: () => void;
}

export default function GimbalControlPad({ onPanTilt, onZoom, onPhoto, onRecordToggle }: GimbalControlPadProps) {
  const { theme, tokens, sp } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(1);

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
      <Text style={[styles.panelTitle, { color: theme.textSecondary, marginBottom: sp(14) }]}>
        CAMERA CONTROLS
      </Text>

      {/* No panel around the controls. The page separates content with rules,
          so an outlined, tinted box here was a third way of saying "these
          belong together" on top of the heading and the vertical rule that
          already divide this column from the readings. */}
      <View style={styles.singleRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.hairline, borderWidth: tokens.rule.hair }]}
          onPress={onPhoto}
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
        >
          <Camera size={17} color={theme.textPrimary} strokeWidth={1.3} />
        </TouchableOpacity>

        <View style={styles.zoomRow}>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: theme.hairline, borderWidth: tokens.rule.hair }]}
            onPress={() => adjustZoom(-1)}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            {/* Drawn glyphs rather than typed "-" and "+": the hyphen sat above
                the optical centre and never matched the plus in weight. */}
            <Minus size={15} color={theme.textPrimary} strokeWidth={1.4} />
          </TouchableOpacity>
          <Text style={[styles.zoomText, { color: theme.textPrimary }]}>{zoom}x</Text>
          <TouchableOpacity
            style={[styles.zoomBtn, { borderColor: theme.hairline, borderWidth: tokens.rule.hair }]}
            onPress={() => adjustZoom(1)}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Plus size={15} color={theme.textPrimary} strokeWidth={1.4} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              borderColor: isRecording ? theme.accentRed : theme.hairline,
              borderWidth: tokens.rule.hair,
              backgroundColor: isRecording ? theme.accentRed : 'transparent',
            },
          ]}
          onPress={handleRecord}
          accessibilityRole="button"
          accessibilityState={{ selected: isRecording }}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <View style={[styles.recordCircle, { backgroundColor: isRecording ? '#FFF' : theme.accentRed }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    // Padding comes from the row this sits in, so the pad lines up with the
    // telemetry grid beside it instead of insetting itself again.
  },
  panelTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
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
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  zoomText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.sm,
    width: 34,
    textAlign: 'center',
    fontVariant: typography.tabularNums,
  },
  actionBtn: {
    // Square and the same 34pt as the zoom controls, so all four targets in the
    // row are one size instead of two.
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCircle: {
    // The one deliberate curve left in the app: a square here reads as "stop",
    // which is the opposite of what this control does.
    width: 11,
    height: 11,
    borderRadius: 6,
  }
});
