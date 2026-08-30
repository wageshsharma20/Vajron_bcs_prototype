import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoView, VideoPlayer } from 'expo-video';
import { MapPin } from 'lucide-react-native';
import { useTheme, typography } from '../theme';
import WaypointOverlay from './WaypointOverlay';
import { useFittedFrame } from '../hooks/useFittedFrame';
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
  const { onLayout, style: frameSize } = useFittedFrame(MAP_FRAME_ASPECT);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Same ratio lock as the planner: the markers are positioned as fractions
          of this frame, so the video must fill it exactly rather than be cropped.
          The frame is measured to the slot rather than declared at 100% width,
          so a short slot shrinks it instead of clipping it. */}
      <View style={[styles.frame, frameSize, { borderColor: theme.hairline }]}>
        <VideoView
          player={player}
          style={styles.video}
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
  // Sized explicitly rather than with absoluteFill: on web the underlying
  // <video> keeps its intrinsic box under absoluteFill and simply overflows the
  // frame, which both leaves dead space beside the picture and slides the map
  // out from under the waypoints positioned over it.
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#0E1512',
  },
  badge: {
    // Flush into the frame's corner as a plate rather than floating inset.
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
