import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { TelemetryFrame } from '../data/types';
import { typography } from '../theme';

interface TelemetryHUDProps {
  telemetry: TelemetryFrame | null;
  isGrid?: boolean;
  /**
   * How many readings sit across. Three suits a column beside other content;
   * six turns the table into a single ribbon for a full-width band; two suits a
   * narrow tower. The rules fall wherever this puts the row breaks.
   */
  columns?: number;
}

/**
 * Renders one numeric value and its unit. Static: the readings update on their
 * own cadence and do not need motion to be noticed.
 */
function Reading({ value, suffix, isGrid }: { value: string | number; suffix: string; isGrid?: boolean }) {
  const { theme } = useTheme();

  return (
    <View style={styles.valueRow}>
      <Text style={[styles.valueText, isGrid && styles.gridValueText, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.suffixText, isGrid && styles.gridSuffixText, { color: theme.textSecondary }]}>{suffix}</Text>
    </View>
  );
}

/**
 * The six flight readings.
 *
 * In grid form they are ruled into a table rather than spaced apart: six
 * free-floating figures make the reader work out which label belongs to which
 * number, whereas cells divided by hairlines are read down a column without
 * effort. The rules only run between cells, never around the outside — an outer
 * box would make the table a card sitting on the page instead of part of it.
 */
export default function TelemetryHUD({ telemetry, isGrid = false, columns = 3 }: TelemetryHUDProps) {
  const { theme, tokens, sp } = useTheme();

  if (!telemetry) return <View style={[styles.container, { backgroundColor: theme.surface }]}><Text>No Telemetry</Text></View>;

  const readings = [
    { label: 'ALT', value: Math.round(telemetry.altitude), suffix: 'm' },
    { label: 'SPD', value: telemetry.groundSpeed.toFixed(1), suffix: 'm/s' },
    { label: 'BAT', value: Math.round(telemetry.batteryPercent), suffix: '%' },
    { label: 'SIG', value: Math.round(telemetry.signalStrength), suffix: '%' },
    { label: 'DIST', value: Math.round(telemetry.distanceToHome), suffix: 'm' },
    { label: 'SATS', value: telemetry.gpsSatsVisible, suffix: '' },
  ];

  return (
    // The inline background used to sit last in this array, so it overrode the
    // transparent one `gridContainer` sets and the ruled table was drawn on a
    // tinted slab — a fill doing the job the rules already do. The grid form now
    // keeps the page's own ground.
    <View
      style={[
        styles.container,
        !isGrid && { backgroundColor: theme.surface, borderBottomColor: theme.border },
        isGrid && styles.gridContainer,
      ]}
    >
      <View style={[styles.row, isGrid && styles.gridRow]}>
        {readings.map((r, i) => (
          <View
            key={r.label}
            style={[
              styles.cellWrapper,
              isGrid && styles.gridCell,
              isGrid && {
                width: `${100 / columns}%` as any,
                borderColor: theme.hairline,
                borderLeftWidth: i % columns === 0 ? 0 : tokens.rule.hair,
                borderTopWidth: i < columns ? 0 : tokens.rule.hair,
                paddingLeft: i % columns === 0 ? 0 : sp(16),
                paddingRight: sp(16),
                paddingVertical: sp(14),
              },
            ]}
          >
            <Text style={[styles.label, isGrid && styles.gridLabel, { color: theme.textSecondary }]}>{r.label}</Text>
            <Reading value={r.value} suffix={r.suffix} isGrid={isGrid} />
          </View>
        ))}
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
    // Width comes from the `columns` prop; see the cell style above.
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: typography.fonts.bold,
    fontSize: 15,
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 5,
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
    fontSize: 15,
    marginLeft: 1,
  }
});
