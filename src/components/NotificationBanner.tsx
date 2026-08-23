import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { Check, X, AlertCircle, Info } from 'lucide-react-native';
import { typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationBannerProps {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
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
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150);

  // If title is not provided, use a default based on type
  const displayTitle = title || (type.charAt(0).toUpperCase() + type.slice(1));

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

  const getStyleColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#EAF8F1', border: '#00C896', iconBg: '#00C896' };
      case 'error':
        return { bg: '#FDECEA', border: '#EE5D5D', iconBg: '#EE5D5D' };
      case 'warning':
        return { bg: '#FDF6E3', border: '#F2C14E', iconBg: '#F2C14E' };
      case 'info':
      default:
        return { bg: '#F0F0FF', border: '#5B68F6', iconBg: '#5B68F6' };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={28} color="#FFFFFF" strokeWidth={3} />;
      case 'error':
        return <X size={28} color="#FFFFFF" strokeWidth={3} />;
      case 'warning':
        return <AlertCircle size={28} color="#FFFFFF" strokeWidth={3} />;
      case 'info':
      default:
        return <Info size={28} color="#FFFFFF" strokeWidth={3} />;
    }
  };

  const colors = getStyleColors();

  return (
    <Animated.View style={[
      styles.container, 
      animatedStyle, 
      { 
        backgroundColor: colors.bg,
        borderLeftColor: colors.border,
      }
    ]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
        {getIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{displayTitle}</Text>
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
    borderRadius: 8,
    borderLeftWidth: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: 17,
    color: '#333333',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  message: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  }
});
