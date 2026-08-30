import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme, tokens } from '../theme';
import { typography } from '../theme';
import { Page, SectionHeading, useHeaderColors } from '../components/Chrome';
import DroneStatusCard from '../components/DroneStatusCard';
import CircularScore from '../components/CircularScore';
import { mockDrones } from '../data/mockFleetData';
import { useTelemetryStore } from '../data/useTelemetryStore';
import { DroneAsset } from '../data/types';
import type { DroneCardTelemetry } from '../components/DroneStatusCard';

export default function FleetDashboardScreen({ navigation }: any) {
  const { theme, tokens, sp } = useTheme();
  const headerColors = useHeaderColors();

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

  // The three readings run down a column of their own beside the roster rather
  // than across a band above it. Nothing horizontal is spent on them, so the
  // roster keeps the page's full height, and the hairlines between them say
  // they are the same kind of measurement read the same way.
  const summary = [
    { score: readiness, label: 'Readiness' },
    { score: avgBattery, label: 'Avg Battery' },
    { score: avgLink, label: 'Link Quality' },
  ];

  return (
    <Page
      title="FLEET OVERVIEW"
      meta={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
      subtitle={
        // Stacked rather than run together on one line: at spine width the
        // single line broke mid-phrase, and three counts read as a key anyway.
        <View>
          <Text style={[styles.statusLine, { color: headerColors.muted }]}>{idleCount} IDLE</Text>
          <Text
            style={[
              styles.statusLine,
              { color: inFlightCount > 0 ? headerColors.title : headerColors.muted },
            ]}
          >
            {inFlightCount} IN FLIGHT
          </Text>
          <Text style={[styles.statusLine, { color: headerColors.muted }]}>
            {chargingCount} CHARGING
          </Text>
        </View>
      }
    >
      <View style={styles.split}>
        <View
          style={[
            styles.summaryColumn,
            { borderRightWidth: tokens.rule.hair, borderRightColor: theme.hairline },
          ]}
        >
          {summary.map((cell, i) => (
            <View
              key={cell.label}
              style={{
                flex: 1,
                justifyContent: 'center',
                paddingVertical: sp(22),
                paddingHorizontal: tokens.gutter,
                alignItems: 'center',
                borderBottomWidth: i < summary.length - 1 ? tokens.rule.hair : 0,
                borderBottomColor: theme.hairline,
              }}
            >
              <CircularScore
                score={cell.score}
                label={cell.label}
                size={120}
                strokeWidth={10}
              />
            </View>
          ))}
        </View>

        <View style={styles.rosterColumn}>
          <Text style={{ fontFamily: typography.fonts.bold, fontSize: 18, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.textSecondary, marginBottom: sp(16) }}>Fleet</Text>
          <ScrollView contentContainerStyle={{ paddingRight: tokens.gutter, paddingBottom: sp(32) }}>
            {drones.map(drone => (
              <DroneStatusCard
                key={drone.id}
                drone={drone}
                telemetry={telemetryById[drone.id]}
                onPress={() => handleDronePress(drone)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  statusLine: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 19,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  summaryColumn: {
    width: '25%',
    justifyContent: 'space-between',
  },
  rosterColumn: {
    flex: 1,
    paddingTop: tokens.gutter,
    paddingLeft: tokens.gutter,
  },
});
