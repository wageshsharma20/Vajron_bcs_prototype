import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { useTheme } from '../theme';
import { PreFlightCheck } from '../data/types';
import { typography } from '../theme';

interface PreFlightChecklistProps {
  checks: PreFlightCheck[];
  onLaunch: () => void;
  isLaunchDisabled?: boolean;
}

export default function PreFlightChecklist({ checks, onLaunch, isLaunchDisabled: externalDisabled }: PreFlightChecklistProps) {
  const { theme, tokens, sp } = useTheme();

  const internalDisabled = checks.some(c => c.blocker && (c.status === 'fail' || c.status === 'checking'));
  const isLaunchDisabled = externalDisabled || internalDisabled;

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
    <View style={styles.container}>
      
      <View style={[styles.list, { marginBottom: sp(20) }]}>
        {checks.map(check => (
          <View
            key={check.id}
            style={[
              styles.checkRow,
              { borderBottomColor: theme.hairline, borderBottomWidth: tokens.rule.hair, paddingVertical: sp(14) },
            ]}
          >
            <View style={styles.statusBadgeContainer}>
              <Text style={[styles.statusBadge, { color: getStatusColor(check.status) }]}>
                [{getStatusIcon(check.status)}]
              </Text>
            </View>
            <Text style={[styles.checkLabel, { color: theme.textPrimary }]}>{check.label}</Text>
            <Text style={[styles.checkValue, { color: theme.textSecondary }]}>{check.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[
          styles.launchButton, 
          // Primary action takes the brand, not the warning colour — amber here
          // read as a caution on the one control meant to look affirmative.
          { backgroundColor: isLaunchDisabled ? theme.surfaceMuted : theme.brand, paddingVertical: sp(17) }
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
    paddingTop: 8,
  },
  list: {
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeContainer: {
    width: 90,
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
    alignItems: 'center',
  },
  launchText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    letterSpacing: 1,
  }
});
