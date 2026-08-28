import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Grid, MapPin, Radio, Wrench } from 'lucide-react-native';
import { useTheme, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Primary navigation.
 *
 * Rendered as chrome rather than as part of the page: it takes the variant's
 * brand surface, and the selected tab is marked by a solid top rule plus weight
 * and colour together, so the current section is not signalled by colour alone.
 */
export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.brand,
          borderTopColor: theme.brand,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        let IconComponent = Grid;
        let label = 'Fleet';
        if (route.name === 'FleetDashboard') {
          IconComponent = Grid;
          label = 'Fleet';
        } else if (route.name === 'MissionPlanner') {
          IconComponent = MapPin;
          label = 'Plan';
        } else if (route.name === 'MissionControl') {
          IconComponent = Radio;
          label = 'Live Ops';
        } else if (route.name === 'FleetMaintenance') {
          IconComponent = Wrench;
          label = 'Service';
        }

        const color = isFocused ? theme.onBrand : theme.onBrandMuted;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={[styles.tabButton, { outlineStyle: 'none' } as any]}
          >
            {/* A solid marker above the selected tab, so selection is not carried
                by colour alone. */}
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: isFocused ? theme.onBrand : 'transparent',
                  borderRadius: tokens.radius.sq,
                },
              ]}
            />
            <View style={styles.iconContainer}>
              <IconComponent size={24} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
              {route.name === 'MissionControl' && (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: theme.onBrand, borderColor: theme.brand },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: isFocused ? typography.fonts.semiBold : typography.fonts.medium,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // 48px+ of vertical target, which keeps the touch area comfortable.
    paddingBottom: 8,
  },
  marker: {
    width: '55%',
    height: 3,
    marginBottom: 9,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 3,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
