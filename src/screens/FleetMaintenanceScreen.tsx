import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { Page, SectionHeading, Rule } from '../components/Chrome';
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

  /**
   * The aircraft selector: a standing list beside the record rather than a
   * segmented strip above it. It costs width but gives the record the page's
   * full height, and it leaves room for a fleet longer than four.
   */
  const selector = (
    <View
      style={[
        styles.selectorColumn,
        { borderRightWidth: tokens.rule.hair, borderRightColor: theme.hairline },
      ]}
    >
      {mockDrones.map((drone) => {
        const selected = selectedDrone.id === drone.id;
        return (
          <TouchableOpacity
            key={drone.id}
            style={[
              styles.selectorBtn,
              {
                backgroundColor: selected ? theme.brand : theme.background,
                paddingVertical: sp(17),
                paddingHorizontal: tokens.gutter,
                borderBottomWidth: tokens.rule.hair,
                borderBottomColor: theme.hairline,
              },
            ]}
            onPress={() => setSelectedDrone(drone)}
          >
            <Text
              style={[
                styles.selectorText,
                { color: selected ? theme.onBrand : theme.textPrimary },
              ]}
            >
              {drone.id}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const record = (
    <ScrollView style={styles.scroller} contentContainerStyle={{ paddingBottom: sp(24) }}>
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

      {/* Holds the same two rows as the accordions above it, so it reads the
          same way: a heading, a rule, and rows on the gutter. */}
      <SectionHeading>Service Schedule</SectionHeading>
      <View style={{ paddingHorizontal: tokens.gutter }}>
        <View style={[styles.suppRow, { paddingVertical: sp(15) }]}>
          <Text style={[styles.suppLabel, { color: theme.textPrimary }]}>Next Required Service</Text>
          <Text style={[styles.suppValue, { color: theme.textPrimary }]}>in 42 flight hours</Text>
        </View>
        <Rule />
        <View style={[styles.suppRow, { paddingVertical: sp(15) }]}>
          <Text style={[styles.suppLabel, { color: theme.textSecondary }]}>Firmware Version</Text>
          <Text style={[styles.suppValue, { color: theme.textSecondary }]}>v2.4.1 (Up to date)</Text>
        </View>
      </View>
    </ScrollView>
  );

  // The action bar is closed off by the heaviest rule on the page, so the
  // standing control never reads as another content row.
  const actionBar = (
    <View
      style={{
        paddingHorizontal: tokens.gutter,
        paddingTop: sp(18),
        paddingBottom: insets.bottom + sp(18),
        borderTopColor: theme.textPrimary,
        borderTopWidth: tokens.rule.thick,
        backgroundColor: theme.background,
      }}
    >
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.brand, paddingVertical: sp(16) }]}>
        <Text style={[styles.actionBtnText, { color: theme.onBrand }]}>SCHEDULE SERVICE</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Page title="FLEET MAINTENANCE">
      <View style={styles.split}>
        {selector}
        <View style={styles.recordColumn}>
          {record}
          {actionBar}
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  recordColumn: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  selectorColumn: {
    width: '24%',
  },
  selectorBtn: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  selectorText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: 13,
    letterSpacing: 1.6,
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
  },
});
