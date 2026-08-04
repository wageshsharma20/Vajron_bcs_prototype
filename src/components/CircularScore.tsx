import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { useTheme, typography } from '../theme';

// Create animated SVG path
const AnimatedPath = Animated.createAnimatedComponent(Path);

type CircularScoreProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
};

export default function CircularScore({ score, size = 200, strokeWidth = 12, label, color: propColor }: CircularScoreProps) {
  const { theme } = useTheme();
  
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2; 

  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const arcLength = Math.PI * radius;
  
  const progressLength = (score / 100) * arcLength;
  const targetDashoffset = arcLength - progressLength;

  // Use passed color or fallback to a safe theme color
  const color = propColor || theme.accentAmber || '#00ff00';
  
  const height = size / 2 + strokeWidth;

  const animatedOffset = useSharedValue(arcLength);

  useEffect(() => {
    animatedOffset.value = withDelay(300, withTiming(targetDashoffset, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }));
  }, [targetDashoffset]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: animatedOffset.value,
    };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: height, alignItems: 'center' }}>
        <Svg width={size} height={height}>
          <Path
            d={arcPath}
            stroke={theme.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedPath
            d={arcPath}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${arcLength}`}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={styles.scoreOverlay}>
          <Text style={[styles.scoreText, { color: theme.textPrimary, fontSize: size * 0.4 }]}>{score}</Text>
        </View>
      </View>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    bottom: -10, // Bring it down a bit so it sits on the baseline
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: typography.fonts.light, // Zen signature
    letterSpacing: -2,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 32, // Large gap (Ma)
  },
});
