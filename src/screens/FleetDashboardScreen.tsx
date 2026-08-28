import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import { PageHeader, SectionHeading, Panel, useHeaderColors } from '../components/Chrome';
import DroneStatusCard from '../components/DroneStatusCard';
import CircularScore from '../components/CircularScore';
import { mockDrones } from '../data/mockFleetData';
import { useTelemetryStore } from '../data/useTelemetryStore';
import { DroneAsset } from '../data/types';
import type { DroneCardTelemetry } from '../components/DroneStatusCard';

export default function FleetDashboardScreen({ navigation }: any) {
  const { theme, tokens, sp } = useTheme();
  const headerColors = useHeaderColors();
  const insets = useSafeAreaInsets();

  const handleDronePress = (drone: DroneAsset) => {
    if (drone.status === 'in-flight') {
      navigation.navigate('MissionControl', { droneId: drone.id });
    } else {
      navigation.navigate('MissionPlanner', { droneId: drone.id });
    }
  };

  // Live fleet state as a primitive snapshot string.
  //
  // Telemetry frames arrive at 10 Hz, but this screen only shows whole-number
  // battery/signal and a fix type. Encoding just those into one string means the
  // subscription compares equal on most frames, so the screen re-renders when a
  // displayed value actually changes rather than ten times a second. That keeps
  // the Pi's CPU idle, and lets the in-flight badge animate instead of being
  // re-bound mid-cycle on every frame.
  //
  // It must be a primitive: a selector returning a fresh array or object each
  // call makes useSyncExternalStore see a new snapshot every time, and React
  // throws "maximum update depth exceeded". A shallow-equality wrapper does not
  // help either, since it compares elements by reference and those are new
  // objects too.
  const fleetSnapshot = useTelemetryStore(state =>
    mockDrones
      .map(drone => {
        const f = state.telemetry[drone.id];
        return f
          ? `${f.isArmed ? 1 : 0}|${Math.round(f.batteryPercent)}|${Math.round(
              f.signalStrength,
            )}|${f.gpsFixType}`
          : '';
      })
      .join(';'),
  );

  const { drones, telemetryById } = useMemo(() => {
    const parts = fleetSnapshot.split(';');
    const cards: Record<string, DroneCardTelemetry> = {};

    const list: DroneAsset[] = mockDrones.map((drone, i) => {
      const raw = parts[i];
      if (!raw) return drone;

      const [armed, battery, signal, fix] = raw.split('|');
      cards[drone.id] = {
        batteryPercent: Number(battery),
        signalStrength: Number(signal),
        gpsFixType: fix as DroneCardTelemetry['gpsFixType'],
      };
      // A drone the store reports as armed is flying, whatever its catalogue
      // entry says — without this, taking off in Live Ops left this screen still
      // showing it idle and "0 IN FLIGHT".
      return armed === '1' ? { ...drone, status: 'in-flight' as const } : drone;
    });

    return { drones: list, telemetryById: cards };
  }, [fleetSnapshot]);

  const inFlightCount = drones.filter(d => d.status === 'in-flight').length;
  const idleCount = drones.filter(d => d.status === 'idle').length;
  const chargingCount = drones.filter(d => d.status === 'charging').length;

  // The gauges read the same live frames instead of fixed numbers, so battery and
  // link quality move as a flight progresses. Readiness is the share of the fleet
  // that is actually available (neither offline nor in maintenance).
  const { readiness, avgBattery, avgLink } = useMemo(() => {
    const mean = (ns: number[]) =>
      ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : 0;
    const available = drones.filter(
      d => d.status !== 'offline' && d.status !== 'maintenance',
    ).length;
    return {
      readiness: drones.length ? Math.round((available / drones.length) * 100) : 0,
      avgBattery: mean(Object.values(telemetryById).map(f => f.batteryPercent)),
      avgLink: mean(Object.values(telemetryById).map(f => f.signalStrength)),
    };
  }, [drones, telemetryById]);

  // The three readings are one row of equal columns divided by hairlines rather
  // than three floating gauges: the dividers say they are the same kind of
  // measurement, and equal columns stop the widest label from setting the gaps.
  const summary = [
    { score: readiness, label: 'Readiness' },
    { score: avgBattery, label: 'Avg Battery' },
    { score: avgLink, label: 'Link Quality' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title="FLEET OVERVIEW"
        meta={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
        subtitle={
          <Text style={[styles.statusText, { color: headerColors.muted }]}>
            {idleCount} IDLE  ·  
            <Text style={{ color: inFlightCount > 0 ? headerColors.title : headerColors.muted }}> {inFlightCount} IN FLIGHT </Text>
            ·  {chargingCount} CHARGING
          </Text>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: sp(32) }}>
        <Panel flush>
          <View
            style={[
              styles.summaryRow,
              { paddingVertical: sp(24), paddingHorizontal: tokens.gutter },
            ]}
          >
            {summary.map((cell, i) => (
              <React.Fragment key={cell.label}>
                {i > 0 ? (
                  <View
                    style={{
                      width: tokens.rule.hair,
                      alignSelf: 'stretch',
                      backgroundColor: theme.hairline,
                    }}
                  />
                ) : null}
                <View style={styles.summaryCell}>
                  <CircularScore score={cell.score} label={cell.label} size={90} strokeWidth={8} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </Panel>

        <SectionHeading>Fleet</SectionHeading>
        <Panel flush>
          <View style={{ paddingHorizontal: tokens.gutter }}>
            {drones.map(drone => (
              <DroneStatusCard 
                key={drone.id} 
                drone={drone} 
                telemetry={telemetryById[drone.id]}
                onPress={() => handleDronePress(drone)} 
              />
            ))}
          </View>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  statusText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
