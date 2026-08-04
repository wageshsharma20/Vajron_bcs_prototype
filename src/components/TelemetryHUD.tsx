import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TelemetryFrame } from '../data/types';
import { typography } from '../theme';

interface TelemetryHUDProps {
  telemetry: TelemetryFrame | null;
}

// Helper component for animating individual numeric values without re-rendering the whole HUD
function AnimatedNumber({ value, suffix }: { value: string | number, suffix: string }) {
  const { theme } = useTheme();
  // Using a simple Text for now. In a real app we might use ReanimatedText or similar 
  // if we needed to avoid React diffing on every frame, but since the mock runs at 10Hz, 
  // a simple prop update is usually fast enough for React Native.
  
  return (
    <View style={styles.metricCell}>
      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: theme.textPrimary }]}>{value}</Text>
        <Text style={[styles.suffixText, { color: theme.textSecondary }]}>{suffix}</Text>
      </View>
    </View>
  );
}

export default function TelemetryHUD({ telemetry }: TelemetryHUDProps) {
  const { theme } = useTheme();

  if (!telemetry) return <View style={[styles.container, { backgroundColor: theme.surface }]}><Text>No Telemetry</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.row}>
        <View style={styles.cellWrapper}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>ALT</Text>
          <AnimatedNumber value={Math.round(telemetry.altitude)} suffix="m" />
        </View>
        <View style={styles.cellWrapper}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>SPD</Text>
          <AnimatedNumber value={telemetry.groundSpeed.toFixed(1)} suffix="m/s" />
        </View>
        <View style={styles.cellWrapper}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>BAT</Text>
          <AnimatedNumber value={Math.round(telemetry.batteryPercent)} suffix="%" />
        </View>
        <View style={styles.cellWrapper}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>SIG</Text>
          <AnimatedNumber value={Math.round(telemetry.signalStrength)} suffix="%" />
        </View>
        <View style={styles.cellWrapper}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>DIST</Text>
          <AnimatedNumber value={Math.round(telemetry.distanceToHome)} suffix="m" />
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cellWrapper: {
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    marginBottom: 4,
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
  suffixText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    marginLeft: 2,
  }
});
