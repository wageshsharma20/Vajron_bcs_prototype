import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography } from '../theme';

interface MissionProgressBarProps {
  totalWaypoints: number;
  currentWaypoint: number;
}

export default function MissionProgressBar({ totalWaypoints, currentWaypoint }: MissionProgressBarProps) {
  const { theme } = useTheme();
  const progress = totalWaypoints > 0 ? Math.min(1, currentWaypoint / totalWaypoints) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          WAYPOINT {currentWaypoint} / {totalWaypoints}
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}>
        <View style={[styles.fill, { backgroundColor: theme.statusGreen, width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
