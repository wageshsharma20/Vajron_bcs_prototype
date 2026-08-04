import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import InspectionAccordion from '../components/InspectionAccordion';
import { mockDrones } from '../data/mockFleetData';

export default function FleetMaintenanceScreen() {
  const { theme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>FLEET MAINTENANCE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Drone Selector Mock */}
        <View style={styles.selectorRow}>
          {mockDrones.map(drone => (
            <TouchableOpacity 
              key={drone.id} 
              style={[
                styles.selectorBtn, 
                { 
                  backgroundColor: selectedDrone.id === drone.id ? theme.textPrimary : theme.surface,
                  borderColor: theme.hairline 
                }
              ]}
              onPress={() => setSelectedDrone(drone)}
            >
              <Text style={[
                styles.selectorText, 
                { color: selectedDrone.id === drone.id ? theme.background : theme.textPrimary }
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
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16, borderTopColor: theme.hairline }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.textPrimary }]}>
          <Text style={[styles.actionBtnText, { color: theme.background }]}>SCHEDULE SERVICE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  selectorRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
  },
  selectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: 1,
  }
});
