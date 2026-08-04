import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import DroneStatusCard from '../components/DroneStatusCard';
import CircularScore from '../components/CircularScore';
import { mockDrones, initialTelemetry } from '../data/mockFleetData';
import { DroneAsset } from '../data/types';

export default function FleetDashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleDronePress = (drone: DroneAsset) => {
    if (drone.status === 'in-flight') {
      navigation.navigate('MissionControl', { droneId: drone.id });
    } else {
      navigation.navigate('MissionPlanner', { droneId: drone.id });
    }
  };

  const inFlightCount = mockDrones.filter(d => d.status === 'in-flight').length;
  const idleCount = mockDrones.filter(d => d.status === 'idle').length;
  const chargingCount = mockDrones.filter(d => d.status === 'charging').length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>FLEET OVERVIEW</Text>
        <Text style={[styles.headerDate, { color: theme.colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Strip */}
        <View style={styles.statusStrip}>
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            {idleCount} IDLE  ·  
            <Text style={{ color: inFlightCount > 0 ? theme.colors.accentAmber : theme.colors.textSecondary }}> {inFlightCount} IN FLIGHT </Text>
            ·  {chargingCount} CHARGING
          </Text>
        </View>

        {/* Fleet Summary Row */}
        <View style={styles.summaryRow}>
          <CircularScore score={85} label="Readiness" size={80} strokeWidth={8} color={theme.colors.statusGreen} />
          <CircularScore score={72} label="Avg Battery" size={80} strokeWidth={8} color={theme.colors.statusGreen} />
          <CircularScore score={95} label="Link Quality" size={80} strokeWidth={8} color={theme.colors.statusGreen} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Drone List */}
        <View style={styles.listContainer}>
          {mockDrones.map(drone => (
            <DroneStatusCard 
              key={drone.id} 
              drone={drone} 
              telemetry={initialTelemetry[drone.id]}
              onPress={() => handleDronePress(drone)} 
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statusStrip: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginBottom: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
});
