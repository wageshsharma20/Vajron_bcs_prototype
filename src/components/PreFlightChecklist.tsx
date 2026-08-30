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

  // The bracketed ASCII glyphs — [✓ PASS], [⚠ WARN] — read as a terminal dump
  // rather than a record. The word alone, tracked and in the status colour,
  // says the same thing and sits in the same family as every other label here.
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pass': return 'PASS';
      case 'fail': return 'FAIL';
      case 'warning': return 'WARN';
      case 'checking': return 'CHECKING';
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
                {getStatusLabel(check.status)}
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
    // Top-aligned, so a label that wraps to two lines keeps its status word on
    // the first line instead of floating to the middle of the row.
    alignItems: 'flex-start',
  },
  statusBadgeContainer: {
    width: 84,
  },
  statusBadge: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    // Sits on the first line's baseline rather than the row's centre.
    marginTop: 4,
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
    fontSize: 13,
    letterSpacing: 1.6,
  }
});
