import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, typography, VARIANT_ORDER, VARIANTS } from '../theme';

/**
 * Switches between the three design variants.
 *
 * This is scaffolding for choosing a direction, not part of the product: it
 * carries no mission data and sits in the chrome rather than the content area,
 * so nothing the application states is added to or altered by it. Remove this
 * component and its mount once a variant is settled on.
 */
export default function DesignVariantSwitcher() {
  const { theme, tokens, variant, setVariant } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.surface, borderTopColor: theme.hairline },
      ]}
    >
      <Text style={[styles.caption, { color: theme.textSecondary }]}>DESIGN</Text>
      <View style={styles.options}>
        {VARIANT_ORDER.map((id) => {
          const active = id === variant;
          return (
            <Pressable
              key={id}
              onPress={() => setVariant(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.option,
                {
                  borderRadius: tokens.radius.sm,
                  backgroundColor: active ? theme.brand : 'transparent',
                  borderColor: active ? theme.brand : theme.hairline,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: active ? theme.onBrand : theme.textSecondary },
                ]}
              >
                {VARIANTS[id].label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  caption: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  options: {
    flexDirection: 'row',
    gap: 6,
  },
  option: {
    paddingHorizontal: 12,
    // 32px tall keeps the target comfortable without adding chrome height.
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
