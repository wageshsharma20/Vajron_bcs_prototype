import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Design system for the GCS.
 *
 * Three variants of one government-grade system, not three unrelated skins:
 * they share the type scale, the status ramps and the component vocabulary, and
 * differ in the things that actually change how an interface reads — chrome
 * treatment, corner language, rule weight and density.
 *
 * All three are laid out on one editorial system: right angles everywhere, a
 * single page gutter, and rules — hair, medium, thick — doing the work that
 * boxes, fills and shadows would otherwise do. What separates the variants is
 * therefore structural rather than decorative: how wide the gutter is, how
 * heavy the section rules run, and how much air sits between rows.
 *
 *   secretariat  formal record. White page, deep green chrome, a 24pt gutter
 *                and heavy 4pt section rules. Reads like an official register.
 *   seva         citizen-facing service. Pale green page, borderless white
 *                blocks set off by whitespace, a wide 32pt gutter, light rules.
 *   control      operations console. Near-black chrome over a white working
 *                area, a tight 20pt gutter and the heaviest section rules, so
 *                dense tabular content still reads in bands.
 *
 * Everything is a token. Components must not hardcode colour, spacing or radius,
 * or a variant switch will only reach half the screen.
 */

export type DesignVariant = 'secretariat' | 'seva' | 'control';

export const typography = {
  fonts: {
    // `light` is mapped to the regular face rather than left undefined: several
    // styles ask for it, and an undefined fontFamily silently falls through to
    // the platform font wherever there is no parent to inherit from.
    light: 'NotoSans_400Regular',
    regular: 'NotoSans_400Regular',
    medium: 'NotoSans_500Medium',
    semiBold: 'NotoSans_600SemiBold',
    bold: 'NotoSans_700Bold',
  },
  tabularNums: ['tabular-nums'] as ('tabular-nums')[],
  sizes: {
    xs: 14,
    sm: 16,
    base: 18,
    md: 20,
    lg: 24,
    xl: 30,
    xxl: 36,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const layout = {
  // Square throughout: see DesignTokens.radius.
  radius: 0,
  radiusSm: 0,
  hairline: 1,
} as const;

export type ColorTheme = {
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Alias kept because several components already read this name. */
  surfaceLight: string;
  textPrimary: string;
  textSecondary: string;
  hairline: string;
  /** Alias kept because several components already read this name. */
  border: string;
  overlay: string;

  /** Chrome: the header and tab bar. */
  brand: string;
  onBrand: string;
  onBrandMuted: string;
  /** Accent used for the active state on light chrome. */
  brandAccent: string;

  statusGreen: string;
  statusGreenMuted: string;
  accentAmber: string;
  accentAmberMuted: string;
  accentRed: string;
  accentRedMuted: string;
};

export type DesignTokens = {
  id: DesignVariant;
  /** Shown only in the design switcher, never in application content. */
  label: string;
  color: ColorTheme;
  /**
   * Corner radii. Every variant now holds these at zero: the layout is built on
   * rules and right angles, and a rounded corner is the one thing that reads as
   * soft against them. Kept as tokens rather than deleted so a future variant
   * can reintroduce a radius in one place instead of thirty.
   */
  radius: { sq: number; sm: number; md: number; lg: number };
  /**
   * Rule weights. The layout separates content with lines rather than with
   * boxes, shadows or fills, so line weight is what carries hierarchy: a hair
   * between rows, a thick rule between whole sections.
   */
  rule: { hair: number; thin: number; medium: number; thick: number };
  /**
   * The single page gutter. Everything on a screen aligns to it — masthead,
   * headings, rows, controls — so the eye reads one continuous left edge down
   * the whole page rather than four competing ones.
   */
  gutter: number;
  /** Multiplier on the shared spacing scale, so density is a variant decision. */
  density: number;
  /** Whether section headings are set in caps with tracking. */
  capsSections: boolean;
  /** Rule weight between rows and around panels. */
  ruleWidth: number;
};

/**
 * Status ramps, light to dark.
 *
 * A value carries two readings at once: which band it is in (hue) and how far
 * through that band it sits (depth). Three stops rather than two, because
 * blending straight from pale to deep drifts through a brighter, more saturated
 * middle than a government interface should show.
 */
export const STATUS_RAMPS = {
  green: ['#A8C4AC', '#5E8F6B', '#1E5233'],
  // Warmed off the previous #B8863F/#77490F, which sat far enough toward brown
  // that a mid reading did not register as orange at all.
  amber: ['#E4C3A0', '#C67B33', '#8A4512'],
  red: ['#D4A9A4', '#AE584E', '#75211A'],
} as const;

export type StatusKey = keyof typeof STATUS_RAMPS;

/**
 * Picks a colour from a status ramp for a 0-100 value: paler at the bottom of
 * the range, deeper at the top, always inside the band's own hue.
 */
export function statusShade(status: StatusKey, value: number): string {
  const ramp = STATUS_RAMPS[status];
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const seg = (v / 100) * (ramp.length - 1);
  const i = Math.min(Math.floor(seg), ramp.length - 2);
  const f = seg - i;
  const toRgb = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const a = toRgb(ramp[i]);
  const b = toRgb(ramp[i + 1]);
  return (
    '#' +
    a
      .map((c, k) => Math.round(c + (b[k] - c) * f).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Maps a reading to its band. Kept here so every surface bands identically.
 *
 * Green is reserved for a genuinely strong reading. An earlier 70/40 split put
 * readings in the seventies — a fleet that is merely serviceable — in the same
 * band as one at full readiness, so a panel of middling numbers came up all
 * green and the banding told the operator nothing.
 */
export function bandFor(value: number): StatusKey {
  if (value >= 80) return 'green';
  if (value >= 50) return 'amber';
  return 'red';
}

const SECRETARIAT: DesignTokens = {
  id: 'secretariat',
  label: 'Secretariat',
  color: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceMuted: '#141414',
    surfaceLight: '#141414',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    hairline: '#333333',
    border: '#333333',
    overlay: 'rgba(0, 0, 0, 0.7)',
    brand: '#000000',
    onBrand: '#00FF00', // neon green
    onBrandMuted: '#005500',
    brandAccent: '#00FFFF', // electric blue
    statusGreen: '#00FF00',
    statusGreenMuted: '#003300',
    accentAmber: '#FF00FF', // cyber pink
    accentAmberMuted: '#330033',
    accentRed: '#FF0000',
    accentRedMuted: '#330000',
  },
  radius: { sq: 0, sm: 0, md: 0, lg: 0 },
  rule: { hair: 1, thin: 1, medium: 2, thick: 4 },
  gutter: 24,
  density: 0.85,
  capsSections: true,
  ruleWidth: 1,
};

const SEVA: DesignTokens = {
  id: 'seva',
  label: 'Seva',
  color: {
    background: '#F1F6F2',
    surface: '#FFFFFF',
    surfaceMuted: '#E4EFE7',
    surfaceLight: '#E4EFE7',
    textPrimary: '#14181A',
    textSecondary: '#566B5E',
    hairline: '#D5E2D8',
    border: '#D5E2D8',
    overlay: 'rgba(20, 24, 26, 0.5)',
    brand: '#17603A',
    onBrand: '#FFFFFF',
    onBrandMuted: '#C4DCCD',
    brandAccent: '#17603A',
    statusGreen: '#1F6A41',
    statusGreenMuted: '#E7F2EB',
    accentAmber: '#95611A',
    accentAmberMuted: '#F8F0E2',
    accentRed: '#9A3229',
    accentRedMuted: '#F9ECEA',
  },
  radius: { sq: 0, sm: 0, md: 0, lg: 0 },
  rule: { hair: 1, thin: 1, medium: 2, thick: 3 },
  gutter: 32,
  density: 1.15,
  capsSections: false,
  ruleWidth: 1,
};

const CONTROL: DesignTokens = {
  id: 'control',
  label: 'Control',
  color: {
    background: '#FFFFFF',
    surface: '#F2F5F3',
    surfaceMuted: '#E3E9E4',
    surfaceLight: '#E3E9E4',
    textPrimary: '#0B0E0C',
    textSecondary: '#4E5A52',
    hairline: '#CCD5CE',
    border: '#CCD5CE',
    overlay: 'rgba(11, 14, 12, 0.6)',
    brand: '#111614',
    onBrand: '#FFFFFF',
    onBrandMuted: '#9FB0A6',
    brandAccent: '#2E7D51',
    statusGreen: '#22603C',
    statusGreenMuted: '#E9F1EC',
    accentAmber: '#8F5A14',
    accentAmberMuted: '#F6EFE1',
    accentRed: '#8F2C22',
    accentRedMuted: '#F8EAE8',
  },
  radius: { sq: 0, sm: 0, md: 0, lg: 0 },
  rule: { hair: 1, thin: 1, medium: 2, thick: 5 },
  gutter: 20,
  density: 0.9,
  capsSections: true,
  ruleWidth: 1,
};

export const VARIANTS: Record<DesignVariant, DesignTokens> = {
  secretariat: SECRETARIAT,
  seva: SEVA,
  control: CONTROL,
};

export const VARIANT_ORDER: DesignVariant[] = ['secretariat', 'seva', 'control'];

/** Backwards-compatible export: the default variant's palette. */
export const lightTheme: ColorTheme = SECRETARIAT.color;

type ThemeContextType = {
  theme: ColorTheme;
  tokens: DesignTokens;
  variant: DesignVariant;
  setVariant: (v: DesignVariant) => void;
  /** Spacing scaled by the variant's density, so panels breathe consistently. */
  sp: (n: number) => number;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: SECRETARIAT.color,
  tokens: SECRETARIAT,
  variant: 'secretariat',
  setVariant: () => {},
  sp: (n) => n,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [variant, setVariant] = useState<DesignVariant>('secretariat');

  const value = useMemo(() => {
    const tokens = VARIANTS[variant];
    return {
      theme: tokens.color,
      tokens,
      variant,
      setVariant,
      sp: (n: number) => Math.round(n * tokens.density),
    };
  }, [variant]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
