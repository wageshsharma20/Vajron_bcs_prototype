import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { TelemetryFrame } from '../data/types';
import { typography } from '../theme';

interface VideoFeedPlayerProps {
  telemetry: TelemetryFrame | null;
}

export default function VideoFeedPlayer({ telemetry }: VideoFeedPlayerProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#1A1A1A' }]}>
      {/* Mock Video Placeholder */}
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>LIVE STREAM</Text>
        {telemetry && (
          <Text style={styles.overlayStats}>
            HLS · 1080p · 152ms · HM30 SIG: {telemetry.signalStrength}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  overlayText: {
    color: '#FFF',
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlayStats: {
    color: '#CCC',
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
