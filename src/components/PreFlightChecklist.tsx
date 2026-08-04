import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { useTheme } from '../theme';
import { PreFlightCheck } from '../data/types';
import { typography } from '../theme';

interface PreFlightChecklistProps {
  checks: PreFlightCheck[];
  onLaunch: () => void;
}

export default function PreFlightChecklist({ checks, onLaunch }: PreFlightChecklistProps) {
  const { theme } = useTheme();

  const isLaunchDisabled = checks.some(c => c.blocker && (c.status === 'fail' || c.status === 'checking'));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return theme.statusGreen;
      case 'fail': return theme.accentRed;
      case 'warning': return theme.accentAmber;
      case 'checking': default: return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓ PASS';
      case 'fail': return '✗ FAIL';
      case 'warning': return '⚠ WARN';
      case 'checking': return '... CHK';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Pre-Flight Checklist</Text>
      
      <ScrollView style={styles.list}>
        {checks.map(check => (
          <View key={check.id} style={[styles.checkRow, { borderBottomColor: theme.hairline }]}>
            <View style={styles.statusBadgeContainer}>
              <Text style={[styles.statusBadge, { color: getStatusColor(check.status) }]}>
                [{getStatusIcon(check.status)}]
              </Text>
            </View>
            <Text style={[styles.checkLabel, { color: theme.textPrimary }]}>{check.label}</Text>
            <Text style={[styles.checkValue, { color: theme.textSecondary }]}>{check.value}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[
          styles.launchButton, 
          { backgroundColor: isLaunchDisabled ? theme.surfaceMuted : theme.accentAmber }
        ]} 
        disabled={isLaunchDisabled}
        onPress={onLaunch}
      >
        <Text style={[
          styles.launchText, 
          { color: isLaunchDisabled ? theme.textSecondary : '#FFFFFF' }
        ]}>
          REVIEW & LAUNCH
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 400,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    marginBottom: 16,
  },
  list: {
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeContainer: {
    width: 65,
  },
  statusBadge: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xs,
  },
  checkLabel: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
  },
  checkValue: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    marginLeft: 8,
  },
  launchButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  launchText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: 1,
  }
});
