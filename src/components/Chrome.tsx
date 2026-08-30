import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography } from '../theme';

/**
 * Shared page furniture: the page frame, the spine, section headings and rules.
 *
 * Keeping this in one place is what makes four screens read as one instrument.
 * A screen asks for "a page with this title" and gets the spine, the gutter and
 * the rules that go with it, instead of deciding for itself.
 */

/** The active page gutter. Everything in the working area aligns to it. */
export function useGutter() {
  const { tokens } = useTheme();
  return tokens.gutter;
}

/**
 * Which text colours are legible on the spine.
 *
 * The spine is always the near-black brand surface, so a screen passing its own
 * subtitle asks here rather than assuming the page ground.
 */
export function useHeaderColors() {
  const { theme } = useTheme();
  return {
    onBrand: true,
    title: theme.onBrand,
    muted: theme.onBrandMuted,
    accent: theme.onBrand,
  };
}

/**
 * A horizontal rule.
 *
 * Weight is the hierarchy: `hair` divides rows of the same kind, `medium`
 * closes a heading off from its content, `thick` separates whole subjects.
 * Because these are the only separators in the design, weight has to be read
 * carefully — two rules of the same weight say the two boundaries mean the
 * same thing.
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

/** A vertical rule, for dividing columns. */
export function VRule({ style }: { style?: ViewStyle }) {
  const { theme, tokens } = useTheme();
  return (
    <View
      style={[{ width: tokens.rule.hair, alignSelf: 'stretch', backgroundColor: theme.hairline }, style]}
    />
  );
}

/**
 * The spine: the masthead, turned on its side.
 *
 * The title sits at the top under a short rule that opens the page; anything
 * secondary is anchored to the foot of the column. Splitting them to the two
 * ends is what stops the spine reading as a stack of leftovers in a tall black
 * box — the eye gets a beginning and an end, and the space between them is
 * deliberate rather than unfilled.
 */
export function PageHeader({
  title,
  meta,
  subtitle,
  foot,
}: {
  title: string;
  meta?: string;
  subtitle?: React.ReactNode;
  /** Chrome anchored to the bottom of the spine, below the meta. */
  foot?: React.ReactNode;
}) {
  const { theme, tokens, sp } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width: tokens.spineWidth,
        paddingTop: insets.top + sp(26),
        paddingBottom: sp(24),
        paddingHorizontal: sp(22),
        backgroundColor: theme.brand,
        justifyContent: 'space-between',
      }}
    >
      <View>
        <View
          style={{
            width: 28,
            height: tokens.rule.medium,
            backgroundColor: theme.onBrand,
            marginBottom: sp(18),
          }}
        />
        <Text style={[styles.spineTitle, { color: theme.onBrand }]}>{title}</Text>
        {subtitle ? <View style={{ marginTop: sp(18) }}>{subtitle}</View> : null}
      </View>

      <View>
        {meta ? (
          <Text style={[styles.spineMeta, { color: theme.onBrandMuted }]}>{meta}</Text>
        ) : null}
        {foot}
      </View>
    </View>
  );
}

/**
 * The page frame: spine on the left, working area to its right.
 *
 * The navigation rail is supplied by the navigator, on the far side of this.
 */
export function Page({
  title,
  meta,
  subtitle,
  spineFoot,
  children,
}: {
  title: string;
  meta?: string;
  subtitle?: React.ReactNode;
  /** Chrome for the foot of the spine — never mission data. */
  spineFoot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <PageHeader title={title} meta={meta} subtitle={subtitle} foot={spineFoot} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

/**
 * Section heading.
 *
 * The heading and the rule beneath it are one unit, so a section always
 * announces itself the same way and its content starts against a line rather
 * than floating.
 */
export function SectionHeading({
  children,
  style,
  first = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** First heading in its column, so it needs no leading section break. */
  first?: boolean;
}) {
  const { theme, tokens, sp } = useTheme();
  return (
    <View style={[{ marginTop: first ? 0 : sp(28) }, style]}>
      <Text
        style={[
          styles.sectionHeading,
          {
            color: theme.textSecondary,
            paddingHorizontal: tokens.gutter,
            marginBottom: sp(9),
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
 * A grouped block of content: a full-bleed band closed by rules.
 *
 * `flush` is for a panel directly under a SectionHeading — that heading's own
 * rule is already the top boundary, so drawing another would double the line.
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
  const { theme, tokens } = useTheme();

  return (
    <View
      style={[
        {
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
  page: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
  },
  body: {
    flex: 1,
  },
  spineTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: 17,
    letterSpacing: 1.6,
    lineHeight: 25,
    textTransform: 'uppercase',
  },
  spineMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionHeading: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
