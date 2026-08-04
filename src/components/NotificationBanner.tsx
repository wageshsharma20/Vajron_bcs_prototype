import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationBannerProps {
  title: string;
  message: string;
  type?: 'warning' | 'error' | 'info';
  durationMs?: number;
  onDismiss?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ 
  title, 
  message, 
  type = 'warning',
  durationMs = 5000,
  onDismiss
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150);

  useEffect(() => {
    // Slide down smoothly without bounce
    translateY.value = withTiming(insets.top + 16, { 
      duration: 400,
      easing: Easing.out(Easing.cubic)
    });
    
    // Slide up after duration
    const timeout = setTimeout(() => {
      translateY.value = withTiming(-150, { 
        duration: 300,
        easing: Easing.in(Easing.cubic)
      });
      if (onDismiss) setTimeout(onDismiss, 300);
    }, durationMs);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const getBackgroundColor = () => {
    if (type === 'error') return theme.accentRed;
    if (type === 'warning') return theme.statusYellow;
    return theme.accentTeal;
  };

  return (
    <Animated.View style={[styles.container, animatedStyle, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.iconContainer}>
        <AlertTriangle size={24} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  }
});
