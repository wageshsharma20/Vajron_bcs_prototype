import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TelemetryFrame } from '../data/types';
import { typography } from '../theme';

interface TelemetryHUDProps {
  telemetry: TelemetryFrame | null;
  isGrid?: boolean;
}

// Helper component for animating individual numeric values without re-rendering the whole HUD
function AnimatedNumber({ value, suffix, isGrid }: { value: string | number, suffix: string, isGrid?: boolean }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.metricCell}>
      <View style={styles.valueRow}>
        <Text style={[styles.valueText, isGrid && styles.gridValueText, { color: theme.textPrimary }]}>{value}</Text>
        <Text style={[styles.suffixText, isGrid && styles.gridSuffixText, { color: theme.textSecondary }]}>{suffix}</Text>
      </View>
    </View>
  );
}

export default function TelemetryHUD({ telemetry, isGrid = false }: TelemetryHUDProps) {
  const { theme } = useTheme();

  if (!telemetry) return <View style={[styles.container, { backgroundColor: theme.surface }]}><Text>No Telemetry</Text></View>;

  return (
    <View style={[styles.container, isGrid && styles.gridContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={[styles.row, isGrid && styles.gridRow]}>
        <View style={[styles.cellWrapper, isGrid && styles.gridCell]}>
          <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>ALT</Text>
          <AnimatedNumber value={Math.round(telemetry.altitude)} suffix="m" isGrid={isGrid} />
        </View>
        <View style={[styles.cellWrapper, isGrid && styles.gridCell]}>
          <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>SPD</Text>
          <AnimatedNumber value={telemetry.groundSpeed.toFixed(1)} suffix="m/s" isGrid={isGrid} />
        </View>
        <View style={[styles.cellWrapper, isGrid && styles.gridCell]}>
          <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>BAT</Text>
          <AnimatedNumber value={Math.round(telemetry.batteryPercent)} suffix="%" isGrid={isGrid} />
        </View>
        <View style={[styles.cellWrapper, isGrid && styles.gridCell]}>
          <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>SIG</Text>
          <AnimatedNumber value={Math.round(telemetry.signalStrength)} suffix="%" isGrid={isGrid} />
        </View>
        <View style={[styles.cellWrapper, isGrid && styles.gridCell]}>
          <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>DIST</Text>
          <AnimatedNumber value={Math.round(telemetry.distanceToHome)} suffix="m" isGrid={isGrid} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridContainer: {
    borderBottomWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridRow: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cellWrapper: {
    alignItems: 'center',
  },
  gridCell: {
    width: '45%',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 9,
    marginBottom: 0,
  },
  metricCell: {
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    letterSpacing: -0.5,
    fontVariant: typography.tabularNums,
  },
  gridValueText: {
    fontSize: typography.sizes.base,
    letterSpacing: -0.2,
  },
  suffixText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    marginLeft: 2,
  },
  gridSuffixText: {
    fontSize: 10,
    marginLeft: 1,
  }
});
