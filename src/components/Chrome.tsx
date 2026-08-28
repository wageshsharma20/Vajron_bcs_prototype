import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography } from '../theme';

/**
 * Shared page furniture: the masthead, section headings, rules and panels.
 *
 * These are where the three variants actually diverge. Putting the divergence
 * here rather than in each screen is what keeps the app reading as one product:
 * a screen asks for "a panel" and gets whatever a panel means in the active
 * variant, instead of every screen deciding for itself.
 *
 * The layout is editorial: right angles, one gutter, and rules doing the
 * separating. Nothing here draws a box where a line will do, because a page of
 * boxes reads as a page of unrelated fragments, whereas a page of ruled bands
 * reads as one continuous record.
 */

/** The active page gutter. Every screen aligns its content to this one value. */
export function useGutter() {
  const { tokens } = useTheme();
  return tokens.gutter;
}

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

/**
 * A horizontal rule.
 *
 * Weight is the hierarchy: `hair` divides rows inside a block, `medium` closes
 * a heading off from its content, `thick` separates whole sections. Because
 * these are the only separators in the layout, weight has to be read carefully
 * — two rules of the same weight say the two boundaries mean the same thing.
 */
export function Rule({
  weight = 'hair',
  inset = false,
  color,
  style,
}: {
  weight?: 'hair' | 'thin' | 'medium' | 'thick';
  /** Pull the rule in to the gutter instead of running it full bleed. */
  inset?: boolean;
  color?: string;
  style?: ViewStyle;
}) {
  const { theme, tokens } = useTheme();
  return (
    <View
      style={[
        {
          height: tokens.rule[weight],
          backgroundColor: color ?? (weight === 'hair' ? theme.hairline : theme.textPrimary),
          marginHorizontal: inset ? tokens.gutter : 0,
        },
        style,
      ]}
    />
  );
}

/**
 * Masthead. Carries the page title and an optional right-hand slot.
 *
 * A short thick rule sits above the title as the page's opening mark. It
 * replaces the vertical tick that used to sit beside the title: that tick
 * indented the title past the gutter, so the masthead started thirteen points
 * to the right of every row beneath it and the page had two left edges.
 */
export function PageHeader({
  title,
  meta,
  subtitle,
}: {
  title: string;
  meta?: string;
  subtitle?: React.ReactNode;
}) {
  const { theme, tokens, sp } = useTheme();
  const insets = useSafeAreaInsets();

  // Secretariat and Control put the title on the brand bar, the way an official
  // masthead sits above the record. Seva keeps it on the page, which suits a
  // lighter, whitespace-led layout.
  const onBrand = tokens.id !== 'seva';

  return (
    <View
      style={{
        paddingTop: insets.top + sp(14),
        paddingBottom: sp(14),
        paddingHorizontal: tokens.gutter,
        backgroundColor: onBrand ? theme.brand : theme.background,
        // On light chrome the masthead needs its own closing rule; on the brand
        // bar the colour change already is the boundary.
        borderBottomWidth: onBrand ? 0 : tokens.rule.thick,
        borderBottomColor: theme.textPrimary,
      }}
    >
      <View
        style={[
          styles.openingMark,
          {
            height: tokens.rule.thick,
            backgroundColor: onBrand ? theme.onBrand : theme.textPrimary,
            marginBottom: sp(10),
          },
        ]}
      />
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerTitle,
            { color: onBrand ? theme.onBrand : theme.textPrimary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
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
      {subtitle ? <View style={{ marginTop: sp(6) }}>{subtitle}</View> : null}
    </View>
  );
}

/**
 * Section heading.
 *
 * The heading and the medium rule under it are one unit, so a section always
 * announces itself the same way and the content below starts against a line
 * rather than floating.
 */
export function SectionHeading({
  children,
  style,
  first = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** First heading on the page, so it does not need the leading section break. */
  first?: boolean;
}) {
  const { theme, tokens, sp } = useTheme();
  return (
    <View style={[{ marginTop: first ? 0 : sp(28) }, style]}>
      <Text
        style={[
          styles.sectionHeading,
          {
            color: theme.textPrimary,
            paddingHorizontal: tokens.gutter,
            marginBottom: sp(8),
            fontFamily: tokens.capsSections ? typography.fonts.bold : typography.fonts.semiBold,
            fontSize: tokens.capsSections ? 11 : 13,
            letterSpacing: tokens.capsSections ? 1.4 : 0.2,
            textTransform: tokens.capsSections ? 'uppercase' : 'none',
          },
        ]}
      >
        {children}
      </Text>
      <Rule weight="medium" />
    </View>
  );
}

/**
 * A grouped block of content.
 *
 * Seva sets its blocks off with a change of ground alone: a white band runs the
 * full width and the tinted page shows through above and below it. No outline,
 * no inset — an outline plus a page tint plus a margin is three separators
 * doing one job, and the inset was also what put Seva's rows nine points to the
 * right of the section headings above them. The formal variants run full-bleed
 * bands closed by rules, which is denser and reads closer to a printed register.
 *
 * `flush` is for a panel that sits directly under a SectionHeading: the
 * heading's own rule is already the top boundary, so drawing another one there
 * would double the line.
 */
export function Panel({
  children,
  style,
  flush = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  flush?: boolean;
}) {
  const { theme, tokens, sp } = useTheme();
  const block = tokens.id === 'seva';

  return (
    <View
      style={[
        block
          ? {
              backgroundColor: theme.surface,
              marginBottom: sp(16),
            }
          : {
              backgroundColor: theme.background,
              borderTopWidth: flush ? 0 : tokens.rule.hair,
              borderBottomWidth: tokens.rule.hair,
              borderColor: theme.hairline,
            },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  openingMark: {
    // A short rule, not a full one: it punctuates the title rather than
    // separating anything, so it must not read as a section break.
    width: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
  sectionHeading: {
    fontFamily: typography.fonts.bold,
  },
});
