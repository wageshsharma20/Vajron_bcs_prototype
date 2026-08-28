import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';
import { PageHeader, SectionHeading, Rule } from '../components/Chrome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import InspectionAccordion from '../components/InspectionAccordion';
import { mockDrones } from '../data/mockFleetData';

export default function FleetMaintenanceScreen() {
  const { theme, tokens, sp } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedDrone, setSelectedDrone] = useState(mockDrones[0]);

  const mockHardwareData = [
    { label: 'Model', value: selectedDrone.model },
    { label: 'Serial Number', value: selectedDrone.serialNumber },
    { label: 'Firmware', value: selectedDrone.firmwareVersion },
    { label: 'FCU', value: 'Pixhawk 6C' }
  ];

  const mockBatteryData = [
    { label: 'Charge Cycles', value: selectedDrone.batteryCycles.toString() },
    { label: 'Max Capacity', value: '92%' },
    { label: 'Degradation', value: '8%' }
  ];

  const mockServiceData = [
    { label: 'Last Service', value: '12 Oct 2025' },
    { label: 'Props Replaced', value: '12 Oct 2025' },
    { label: 'Motor Calibrated', value: '05 Sep 2025' }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader title="FLEET MAINTENANCE" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* One segmented control rather than four detached chips: the shared
            edges say these are the alternatives to a single choice, and there
            is no gap left over to read as spacing between unrelated buttons. */}
        <View
          style={[
            styles.selectorRow,
            {
              marginHorizontal: tokens.gutter,
              marginTop: sp(20),
              marginBottom: sp(24),
              borderWidth: tokens.rule.thin,
              borderColor: theme.textPrimary,
            },
          ]}
        >
          {mockDrones.map((drone, i) => (
            <TouchableOpacity 
              key={drone.id} 
              style={[
                styles.selectorBtn, 
                { 
                  backgroundColor: selectedDrone.id === drone.id ? theme.brand : theme.background,
                  borderLeftWidth: i === 0 ? 0 : tokens.rule.thin,
                  borderLeftColor: theme.textPrimary,
                  paddingVertical: sp(12),
                }
              ]}
              onPress={() => setSelectedDrone(drone)}
            >
              <Text style={[
                styles.selectorText, 
                { color: selectedDrone.id === drone.id ? theme.onBrand : theme.textPrimary }
              ]}>{drone.id}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <InspectionAccordion 
          index={0}
          data={{
            category: "Hardware & Firmware",
            iconName: "Wrench",
            items: mockHardwareData.map((d, i) => ({ id: `hw-${i}`, name: d.label, value: d.value, status: 'good' }))
          }}
        />
        <InspectionAccordion 
          index={1}
          data={{
            category: "Battery Health",
            iconName: "Sparkles",
            items: mockBatteryData.map((d, i) => ({ id: `bat-${i}`, name: d.label, value: d.value, status: d.label === 'Degradation' ? 'attention' : 'good' }))
          }}
        />
        <InspectionAccordion 
          index={2}
          data={{
            category: "Service History",
            iconName: "ShieldCheck",
            items: mockServiceData.map((d, i) => ({ id: `srv-${i}`, name: d.label, value: d.value, status: 'good' }))
          }}
        />

        {/* Was a filled, outlined box floating inside the page. It holds the
            same two rows as the accordions above it, so it now reads the same
            way: a heading, a rule, and rows on the gutter. */}
        <SectionHeading>SERVICE SCHEDULE</SectionHeading>
        <View style={{ paddingHorizontal: tokens.gutter }}>
          <View style={[styles.suppRow, { paddingVertical: sp(14) }]}>
            <Text style={[styles.suppLabel, { color: theme.textPrimary }]}>Next Required Service</Text>
            <Text style={[styles.suppValue, { color: theme.textPrimary }]}>in 42 flight hours</Text>
          </View>
          <Rule />
          <View style={[styles.suppRow, { paddingVertical: sp(14) }]}>
            <Text style={[styles.suppLabel, { color: theme.textSecondary }]}>Firmware Version</Text>
            <Text style={[styles.suppValue, { color: theme.textSecondary }]}>v2.4.1 (Up to date)</Text>
          </View>
        </View>
      </ScrollView>

      {/* The action bar is closed off by a thick rule, the heaviest line on the
          page, so the standing control never reads as another content row. */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            paddingHorizontal: tokens.gutter,
            paddingTop: sp(16),
            paddingBottom: insets.bottom + sp(16),
            borderTopColor: theme.textPrimary,
            borderTopWidth: tokens.rule.thick,
          },
        ]}
      >
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.brand, paddingVertical: sp(17) }]}>
          <Text style={[styles.actionBtnText, { color: theme.onBrand }]}>SCHEDULE SERVICE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  selectorRow: {
    flexDirection: 'row',
  },
  selectorBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: 1,
  },
  suppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suppLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
  },
  suppValue: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
  }
});
