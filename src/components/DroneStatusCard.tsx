import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { DroneAsset, TelemetryFrame } from '../data/types';
import { typography } from '../theme';

/**
 * Only the three fields the card actually renders. Narrowing this is what lets
 * the Fleet screen subscribe shallowly and re-render when a displayed value
 * changes rather than on every 10 Hz telemetry frame.
 */
export type DroneCardTelemetry = Pick<
  TelemetryFrame,
  'batteryPercent' | 'signalStrength' | 'gpsFixType'
>;

interface DroneStatusCardProps {
  drone: DroneAsset;
  telemetry?: DroneCardTelemetry;
  onPress: () => void;
}

function timeAgo(isoString: string) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function DroneStatusCard({ drone, telemetry, onPress }: DroneStatusCardProps) {
  const { theme, tokens, sp } = useTheme();

  const getStatusColor = () => {
    switch (drone.status) {
      case 'in-flight': return theme.statusGreen;
      case 'idle': return theme.textSecondary;
      // Offline and idle share a colour deliberately: neither is a fault, and
      // giving "nothing is happening" its own hue would imply otherwise.
      case 'charging': return theme.accentAmber;
      case 'maintenance': return theme.accentRed;
      case 'offline': default: return theme.textSecondary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: theme.hairline, borderBottomWidth: tokens.rule.hair, paddingVertical: sp(18) },
      ]}
      onPress={onPress}
    >
      {/* The status marker hangs in the gutter as a rule rather than sitting
          inline as a dot, so the row's text keeps one unbroken left edge and
          the marker still reads down the list as a column of its own. */}
      <View style={[styles.marker, { backgroundColor: statusColor }]} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{drone.id}</Text>

        {/* Set as a word in the status colour rather than a filled chip. The
            chip was a box on a page that has no other boxes, and it made four
            grey pills the loudest thing in the roster; the marker in the gutter
            and the tracked caps carry the same state with less furniture.
            Static — the in-flight badge used to pulse, which is decorative
            motion on a status an operator reads rather than an alert. */}
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {drone.status === 'in-flight' ? 'IN FLIGHT' : drone.status.toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.model, { color: theme.textSecondary }]}>{drone.model}</Text>
      
      <View style={styles.metricsRow}>
        {telemetry ? (
          <>
            <Text style={[styles.metric, { color: theme.textPrimary }]}>
              {telemetry.batteryPercent}% BAT
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.hairline }]}>·</Text>
            <Text style={[styles.metric, { color: theme.textPrimary }]}>
              {telemetry.signalStrength}% SIG
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.hairline }]}>·</Text>
            <Text style={[styles.metric, { color: theme.textPrimary }]}>
              {telemetry.gpsFixType.toUpperCase()} FIX
            </Text>
          </>
        ) : (
          <Text style={[styles.metric, { color: theme.textSecondary }]}>
            No live telemetry
          </Text>
        )}
        <Text style={[styles.dotSeparator, { color: theme.hairline }]}>·</Text>
        <Text style={[styles.metric, { color: theme.textSecondary }]}>
          Last: {timeAgo(drone.lastSeenAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // Rows carry no background and no outline; the hairline beneath and the air
    // above and below are the whole separation.
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    // Sits outside the text column, in the page gutter.
    left: -12,
    top: 20,
    width: 3,
    height: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: -0.3,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  model: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.2,
    fontVariant: typography.tabularNums,
  },
  dotSeparator: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    marginHorizontal: 6,
  },
});
