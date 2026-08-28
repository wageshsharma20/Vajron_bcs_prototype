import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, typography, statusShade, bandFor, StatusKey } from '../theme';

type CircularScoreProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
  /** Forces a band. Omitted, the band is taken from the value itself. */
  status?: StatusKey;
};

/**
 * Semicircular reading.
 *
 * The arc carries two things at once. Its hue is the band — green, amber or red
 * — and its depth is the value inside that band, pale at the bottom of the range
 * and deep at the top. So a weak green and a strong green are both green, and
 * still tell apart at a glance.
 *
 * The figure is repeated as text beneath the arc, so the reading never depends
 * on distinguishing colours.
 *
 * Drawn statically. The arc previously swept in on mount, which is decorative
 * motion on a panel an operator reads at a glance.
 */
export default function CircularScore({
  score,
  size = 200,
  strokeWidth = 12,
  label,
  color: propColor,
  status,
}: CircularScoreProps) {
  const { theme } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const arcLength = Math.PI * radius;
  const dashoffset = arcLength - (Math.max(0, Math.min(100, score)) / 100) * arcLength;

  const color = propColor ?? statusShade(status ?? bandFor(score), score);

  // Butt caps stop the stroke exactly at cy rather than half a stroke below it,
  // so the arc's true height is size/2; padding beyond that only pushes the
  // figure out of the arc's opening.
  const height = size / 2;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height, alignItems: 'center' }}>
        <Svg width={size} height={height}>
          <Path d={arcPath} stroke={theme.surfaceMuted} strokeWidth={strokeWidth} fill="transparent" />
          <Path
            d={arcPath}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${arcLength}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>
        <View style={styles.scoreOverlay}>
          <Text style={[styles.scoreText, { color: theme.textPrimary, fontSize: size * 0.3 }]}>
            {score}
          </Text>
        </View>
      </View>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 0,
    bottom: -6,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scoreText: {
    fontFamily: typography.fonts.semiBold,
    letterSpacing: -0.5,
    fontVariant: typography.tabularNums,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 12,
    textAlign: 'center',
  },
});
