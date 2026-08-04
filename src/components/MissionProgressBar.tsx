import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface MissionProgressBarProps {
  totalWaypoints: number;
  currentWaypoint: number;
}

export default function MissionProgressBar({ totalWaypoints, currentWaypoint }: MissionProgressBarProps) {
  const theme = useTheme();
  const progress = totalWaypoints > 0 ? Math.min(1, currentWaypoint / totalWaypoints) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceLight }]}>
        <View style={[styles.fill, { backgroundColor: theme.colors.accentAmber, width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  }
});
