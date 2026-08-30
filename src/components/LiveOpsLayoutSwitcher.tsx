import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, typography } from '../theme';
import { LIVE_OPS_LAYOUTS, type LiveOpsLayout } from '../screens/liveOpsLayouts';

/**
 * Switches between the Live Ops arrangements.
 *
 * Scaffolding for choosing one, not part of the product. It sits at the foot of
 * the spine rather than anywhere in the working area, so the arrangement being
 * judged is never competing with the control used to pick it, and it carries no
 * mission data. Remove this component, its mount and `liveOpsLayouts.ts` once an
 * arrangement is settled on.
 */
export default function LiveOpsLayoutSwitcher({
  value,
  onChange,
}: {
  value: LiveOpsLayout;
  onChange: (v: LiveOpsLayout) => void;
}) {
  const { theme, sp } = useTheme();

  return (
    <View style={{ marginTop: sp(20) }}>
      <Text style={[styles.caption, { color: theme.onBrandMuted, marginBottom: sp(8) }]}>
        LAYOUT
      </Text>
      {LIVE_OPS_LAYOUTS.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.row}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: active ? theme.onBrand : 'transparent' },
              ]}
            />
            <Text
              style={[
                styles.label,
                {
                  color: active ? theme.onBrand : theme.onBrandMuted,
                  fontFamily: active ? typography.fonts.semiBold : typography.fonts.regular,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    letterSpacing: 1.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // 26pt rows: tight enough for seven in a spine, still a comfortable target.
    paddingVertical: 5,
  },
  marker: {
    width: 2,
    height: 11,
    marginRight: 9,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.9,
  },
});
