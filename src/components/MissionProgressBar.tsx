import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography } from '../theme';

interface MissionProgressBarProps {
  totalWaypoints: number;
  currentWaypoint: number;
}

export default function MissionProgressBar({ totalWaypoints, currentWaypoint }: MissionProgressBarProps) {
  const { theme, sp } = useTheme();
  const progress = totalWaypoints > 0 ? Math.min(1, currentWaypoint / totalWaypoints) : 0;

  return (
    <View style={[styles.container, { paddingVertical: sp(10) }]}>
      <View style={[styles.labelRow, { marginBottom: sp(8) }]}>
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
    // Horizontal padding is supplied by the section it sits in, so the bar runs
    // the full width of that column instead of insetting itself a second time.
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  track: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  }
});
