import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoView, VideoPlayer } from 'expo-video';
import { useTheme } from '../theme';
import { TelemetryFrame } from '../data/types';
import { typography } from '../theme';

interface VideoFeedPlayerProps {
  telemetry: TelemetryFrame | null;
  player: VideoPlayer;
  /** Before take-off the feed is held on its first frame under a standby veil. */
  isArmed: boolean;
}

export default function VideoFeedPlayer({ telemetry, player, isArmed }: VideoFeedPlayerProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#1A1A1A' }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        playsInline
        fullscreenOptions={{ enable: false }}
      />

      {/* Dims the held first frame so a standing aircraft does not read as a
          live downlink. */}
      {!isArmed && (
        <View style={styles.standbyVeil}>
          <Text style={styles.standbyText}>FEED STANDBY</Text>
          <Text style={styles.standbySub}>Awaiting take-off</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.liveRow}>
          {isArmed && <View style={[styles.liveDot, { backgroundColor: theme.accentRed }]} />}
          <Text style={styles.overlayText}>{isArmed ? 'LIVE STREAM' : 'STREAM IDLE'}</Text>
        </View>
        {telemetry && isArmed && (
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
    overflow: 'hidden',
  },
  standbyVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,10,10,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standbyText: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    letterSpacing: 2,
  },
  standbySub: {
    color: '#BBBBBB',
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    marginTop: 3,
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    fontSize: 15,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
