import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoView, VideoPlayer } from 'expo-video';
import { MapPin } from 'lucide-react-native';
import { useTheme, typography } from '../theme';
import WaypointOverlay from './WaypointOverlay';
import { MAP_FRAME_ASPECT } from '../data/flightWaypoints';

interface MissionMapViewProps {
  player: VideoPlayer;
  /** Before take-off the map holds on its first frame instead of animating. */
  isArmed: boolean;
  /** Mission progress 0-1, used to fill in waypoints as they are passed. */
  progress?: number;
}

/**
 * The map half of Mission Control: the flight-path recording with the survey
 * waypoints drawn over it.
 *
 * The waypoints are an overlay rather than part of the recording, so they can
 * fill in as the aircraft reaches them and stay crisp at any size — burning them
 * into the video would fix both.
 */
export default function MissionMapView({ player, isArmed, progress }: MissionMapViewProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Same ratio lock as the planner: the markers are positioned as fractions
          of this frame, so the video must fill it exactly rather than be cropped. */}
      <View style={[styles.frame, { borderColor: theme.hairline }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          nativeControls={false}
          playsInline
          fullscreenOptions={{ enable: false }}
        />

        <WaypointOverlay size={14} showLabels={false} progress={progress} />

        <View style={styles.badge}>
          <MapPin size={11} color="#FFFFFF" />
          <Text style={styles.badgeText}>
            {isArmed ? 'FLIGHT PATH · LIVE' : 'FLIGHT PATH · STANDBY'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  frame: {
    width: '100%',
    aspectRatio: MAP_FRAME_ASPECT,
    maxHeight: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#0E1512',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
