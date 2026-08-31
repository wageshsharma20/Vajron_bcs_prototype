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
    /**
     * Used for the product name in the spine and nothing else. A light display
     * face suits a masthead but not a readout, so it deliberately does not
     * reach the working area, where figures have to hold up at a glance.
     */
    display: 'TypeLightSans',
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
  /**
   * Scrims laid over imagery so a white label survives whatever the camera
   * happened to be pointing at. `overlay` plates a badge; `overlayHeavy` is the
   * full veil over a held frame. Both are mixed from the deep green rather than
   * from neutral black, so a scrim reads as the station dimming its own picture
   * rather than as a grey wash dropped on top of it.
   */
  overlay: string;
  overlayHeavy: string;

  /** Chrome: the spine and the navigation rail. */
  brand: string;
  onBrand: string;
  onBrandMuted: string;
  /** Accent used for the active state on light chrome. */
  brandAccent: string;
  /**
   * The deepest green in the family, for media mattes: the letterbox behind a
   * video frame and the ground under a map tile. Dark enough to sit behind
   * imagery without competing with it, but still a green rather than a black,
   * so a dead feed reads as part of the station and not as a hole in it.
   */
  brandDeep: string;

  statusGreen: string;
  statusGreenMuted: string;
  accentAmber: string;
  accentAmberMuted: string;
  accentRed: string;
  accentRedMuted: string;
};

/**
 * Deep-green chrome over a white working area.
 *
 * The greens are not new to the estate: they are the survey app's own ramp,
 * lifted stop for stop so the two applications read as one system rather than
 * two products that happen to share a client. #1E5233 is that app's deepest
 * forest and #A3C9AE its lightest leaf; the pale washes are its panel tints.
 *
 * Chrome was previously near-black. Black is the absence of a decision — it
 * reads as unfinished tooling rather than as an instrument, and it shares no
 * ancestry with the app the operator uses for the same parks. The spine and the
 * rail now carry the forest, and the working area keeps its white ground so the
 * readouts stay the loudest thing on the screen.
 *
 * Warning and alarm stay amber and red. A green interface must not colour its
 * own exceptions green, or the one moment the palette has to raise its voice is
 * the moment it blends in.
 */
export const PALETTE: ColorTheme = {
  background: '#FFFFFF',
  surface: '#ECF5EF',
  surfaceMuted: '#E2EFE5',
  surfaceLight: '#E2EFE5',
  // Near-black to the eye, but mixed from the forest rather than from neutral
  // grey, so text sits in the same family as the chrome instead of cutting
  // against it. Contrast on white is far past AA either way.
  textPrimary: '#0D2117',
  textSecondary: '#4E6357',
  hairline: '#CBDFD2',
  border: '#CBDFD2',
  overlay: 'rgba(15, 42, 27, 0.62)',
  overlayHeavy: 'rgba(15, 42, 27, 0.74)',
  brand: '#1E5233',
  onBrand: '#FFFFFF',
  onBrandMuted: '#A3C9AE',
  brandAccent: '#5B9C6E',
  brandDeep: '#0F2A1B',
  statusGreen: '#1E5233',
  statusGreenMuted: '#E2EFE5',
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
};

export const tokens: LayoutTokens = {
  spineWidth: 208,
  navRailWidth: 92,
  gutter: 28,
  density: 1.05,
  radius: { sq: 0, sm: 0, md: 0, lg: 0 },
  rule: { hair: 1, thin: 1, medium: 2, thick: 4 },
  gaugeSize: 92,
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
  // The survey app's score ramp, stop for stop.
  green: ['#A3C9AE', '#5B9C6E', '#1E5233'],
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
