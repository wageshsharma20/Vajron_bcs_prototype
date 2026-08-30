import React from 'react';

/**
 * Design system for the GCS.
 *
 * One palette, one type scale, one set of status ramps, square corners, and
 * rules instead of boxes. Nothing below may introduce a colour, a face or a
 * shape that is not defined here.
 *
 * The layout is a spine and a rail: the masthead rotated ninety degrees into a
 * fixed column down the left edge, navigation as a rail down the right. Both
 * pieces of chrome are vertical, so no horizontal band is spent on either and
 * the whole middle of the screen belongs to content.
 *
 * Everything is a token. Components must not hardcode colour, spacing or rule
 * weight, or a change here will only reach half the screen.
 */

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
  // Square throughout: see LayoutTokens.radius.
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

  /** Chrome: the spine and the navigation rail. */
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

/** Near-black chrome over a white working area. */
export const PALETTE: ColorTheme = {
  background: '#FFFFFF',
  surface: '#F7F9F8',
  surfaceMuted: '#EDF1EE',
  surfaceLight: '#EDF1EE',
  textPrimary: '#0B0E0C',
  textSecondary: '#5A665E',
  hairline: '#DCE3DE',
  border: '#DCE3DE',
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
};

/** Backwards-compatible export: several modules already read this name. */
export const lightTheme: ColorTheme = PALETTE;

export type LayoutTokens = {
  /** Width of the masthead spine down the left edge. */
  spineWidth: number;
  /** Width of the navigation rail down the right edge. */
  navRailWidth: number;
  /**
   * The single page gutter. Everything in the working area aligns to it —
   * headings, rows, controls — so the eye reads one continuous left edge down
   * the page rather than several competing ones.
   */
  gutter: number;
  /** Multiplier on the shared spacing scale. */
  density: number;
  /**
   * Corner radii, held at zero. The design is built on rules and right angles,
   * and a rounded corner is the one thing that reads as soft against them. Kept
   * as tokens rather than deleted so the value lives in one place, not thirty.
   */
  radius: { sq: number; sm: number; md: number; lg: number };
  /**
   * Rule weights. Content is separated with lines rather than boxes, shadows or
   * fills, so weight is what carries hierarchy: a hair between rows of the same
   * kind, a thick rule between whole subjects.
   */
  rule: { hair: number; thin: number; medium: number; thick: number };
  /** Diameter of the fleet summary gauges — how loudly the fleet score speaks. */
  gaugeSize: number;
  /**
   * How the camera feed and the map divide the width of the picture row. The
   * feed is the operator's eye on the aircraft, so it takes the larger share.
   */
  mediaSplit: { feed: number; map: number };
};

export const tokens: LayoutTokens = {
  spineWidth: 208,
  navRailWidth: 92,
  gutter: 28,
  density: 1.05,
  radius: { sq: 0, sm: 0, md: 0, lg: 0 },
  rule: { hair: 1, thin: 1, medium: 2, thick: 4 },
  gaugeSize: 92,
  mediaSplit: { feed: 1.8, map: 1 },
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

type ThemeContextType = {
  theme: ColorTheme;
  tokens: LayoutTokens;
  /** Spacing scaled by the layout's density, so the page breathes consistently. */
  sp: (n: number) => number;
};

const VALUE: ThemeContextType = {
  theme: PALETTE,
  tokens,
  sp: (n: number) => Math.round(n * tokens.density),
};

const ThemeContext = React.createContext<ThemeContextType>(VALUE);

export const useTheme = () => React.useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>
);
