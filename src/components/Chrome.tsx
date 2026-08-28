import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography } from '../theme';

/**
 * Shared page furniture: the masthead, section headings and panels.
 *
 * These are where the three variants actually diverge. Putting the divergence
 * here rather than in each screen is what keeps the app reading as one product:
 * a screen asks for "a panel" and gets whatever a panel means in the active
 * variant, instead of every screen deciding for itself.
 */

/**
 * Which text colours are legible on the masthead in the active variant.
 *
 * Two of the three variants put the title on a dark brand bar, so a screen
 * passing its own subtitle cannot know whether it is drawing on light or dark.
 * Asking here keeps a caller from landing dark grey on dark green.
 */
export function useHeaderColors() {
  const { theme, tokens } = useTheme();
  const onBrand = tokens.id !== 'seva';
  return {
    onBrand,
    title: onBrand ? theme.onBrand : theme.textPrimary,
    muted: onBrand ? theme.onBrandMuted : theme.textSecondary,
    accent: onBrand ? theme.onBrand : theme.brand,
  };
}

/** Masthead. Carries the page title and an optional right-hand slot. */
export function PageHeader({
  title,
  meta,
  subtitle,
}: {
  title: string;
  meta?: string;
  subtitle?: React.ReactNode;
}) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  // Secretariat and Control put the title on the brand bar, the way an official
  // masthead sits above the record. Seva keeps it on the page, which suits a
  // lighter, card-led layout.
  const onBrand = tokens.id !== 'seva';

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 10,
          backgroundColor: onBrand ? theme.brand : theme.background,
          borderBottomColor: onBrand ? theme.brand : theme.hairline,
          borderBottomWidth: onBrand ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          {/* A short rule beside the title reads as an official mark without
              adding a decorative logo. */}
          <View
            style={[
              styles.mark,
              { backgroundColor: onBrand ? theme.onBrand : theme.brand },
            ]}
          />
          <Text
            style={[
              styles.headerTitle,
              { color: onBrand ? theme.onBrand : theme.textPrimary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {meta ? (
          <Text
            style={[
              styles.headerMeta,
              { color: onBrand ? theme.onBrandMuted : theme.textSecondary },
            ]}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {subtitle ? <View style={styles.headerSubtitle}>{subtitle}</View> : null}
    </View>
  );
}

/** Section heading. Caps and tracked in the formal variants, plain in Seva. */
export function SectionHeading({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme, tokens, sp } = useTheme();
  return (
    <View style={[{ paddingHorizontal: sp(20), marginBottom: sp(8) }, style]}>
      <Text
        style={[
          styles.sectionHeading,
          {
            color: theme.textSecondary,
            fontFamily: tokens.capsSections ? typography.fonts.bold : typography.fonts.semiBold,
            fontSize: tokens.capsSections ? 11 : 13,
            letterSpacing: tokens.capsSections ? 1.4 : 0.2,
            textTransform: tokens.capsSections ? 'uppercase' : 'none',
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * A grouped block of content.
 *
 * Seva renders an inset white card on the tinted page; the formal variants
 * render a full-bleed band separated by rules, which is denser and reads closer
 * to a printed register.
 */
export function Panel({
  children,
  style,
  inset = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  inset?: boolean;
}) {
  const { theme, tokens, sp } = useTheme();
  const card = tokens.id === 'seva';

  return (
    <View
      style={[
        card
          ? {
              backgroundColor: theme.surface,
              borderRadius: tokens.radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.hairline,
              marginHorizontal: inset ? sp(16) : 0,
              marginBottom: sp(12),
              paddingVertical: sp(4),
            }
          : {
              backgroundColor: theme.background,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderColor: theme.hairline,
              marginBottom: sp(12),
            },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  mark: {
    width: 3,
    height: 18,
    marginRight: 10,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  headerMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    marginLeft: 12,
  },
  headerSubtitle: {
    marginTop: 6,
    paddingLeft: 13,
  },
  sectionHeading: {
    fontFamily: typography.fonts.bold,
  },
});
