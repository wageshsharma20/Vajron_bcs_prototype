import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { DroneAsset, TelemetryFrame } from '../data/types';
import { typography } from '../theme';
import { usePulseAnimation } from '../hooks/usePulseAnimation';

interface DroneStatusCardProps {
  drone: DroneAsset;
  telemetry?: TelemetryFrame;
  onPress: () => void;
}

function timeAgo(isoString: string) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function DroneStatusCard({ drone, telemetry, onPress }: DroneStatusCardProps) {
  const theme = useTheme();
  const pulseStyle = usePulseAnimation(drone.status === 'in-flight');

  const getStatusColor = () => {
    switch (drone.status) {
      case 'in-flight': return theme.colors.accentAmber;
      case 'idle': return theme.colors.statusGreen;
      case 'charging': return theme.colors.statusGreen;
      case 'maintenance': return theme.colors.accentRed;
      case 'offline': default: return theme.colors.textSecondary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <TouchableOpacity style={[styles.container, { borderBottomColor: theme.colors.border }]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{drone.id}</Text>
        </View>
        
        {drone.status === 'in-flight' && (
          <Animated.View style={[styles.badge, { backgroundColor: theme.colors.accentAmber + '20' }, pulseStyle]}>
            <Text style={[styles.badgeText, { color: theme.colors.accentAmber }]}>IN FLIGHT</Text>
          </Animated.View>
        )}
        {drone.status !== 'in-flight' && (
          <View style={[styles.badge, { backgroundColor: theme.colors.surfaceLight }]}>
            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{drone.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.model, { color: theme.colors.textSecondary }]}>{drone.model}</Text>
      
      <View style={styles.metricsRow}>
        {telemetry ? (
          <>
            <Text style={[styles.metric, { color: theme.colors.textPrimary }]}>
              {telemetry.batteryPercent}% BAT
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.colors.border }]}>·</Text>
            <Text style={[styles.metric, { color: theme.colors.textPrimary }]}>
              {telemetry.signalStrength}% SIG
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.colors.border }]}>·</Text>
            <Text style={[styles.metric, { color: theme.colors.textPrimary }]}>
              {telemetry.gpsFixType.toUpperCase()} FIX
            </Text>
          </>
        ) : (
          <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>
            No live telemetry
          </Text>
        )}
        <Text style={[styles.dotSeparator, { color: theme.colors.border }]}>·</Text>
        <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>
          Last: {timeAgo(drone.lastSeenAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  model: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.2,
  },
  dotSeparator: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    marginHorizontal: 6,
  },
});
