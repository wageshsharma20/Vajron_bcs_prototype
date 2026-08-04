import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import InspectionAccordion from '../components/InspectionAccordion';
import { mockDrones } from '../data/mockFleetData';

export default function FleetMaintenanceScreen() {
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>FLEET MAINTENANCE</Text>
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
                  backgroundColor: selectedDrone.id === drone.id ? theme.colors.textPrimary : theme.colors.surface,
                  borderColor: theme.colors.border 
                }
              ]}
              onPress={() => setSelectedDrone(drone)}
            >
              <Text style={[
                styles.selectorText, 
                { color: selectedDrone.id === drone.id ? theme.colors.background : theme.colors.textPrimary }
              ]}>{drone.id}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <InspectionAccordion 
          title="Hardware & Firmware" 
          items={mockHardwareData} 
          defaultExpanded={true} 
        />
        <InspectionAccordion 
          title="Battery Health" 
          items={mockBatteryData} 
          defaultExpanded={true} 
        />
        <InspectionAccordion 
          title="Service History" 
          items={mockServiceData} 
          defaultExpanded={false} 
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.textPrimary }]}>
          <Text style={[styles.actionBtnText, { color: theme.colors.background }]}>SCHEDULE SERVICE</Text>
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
    borderTopColor: '#DEE2E6',
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
