import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Grid, MapPin, Radio, Wrench } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.hairline, paddingBottom: insets.bottom + 8 }]}>
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

        const color = isFocused ? theme.accentAmber : theme.textSecondary;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.iconContainer}>
              <IconComponent size={24} color={color} strokeWidth={isFocused ? 2.5 : 2} />
              {route.name === 'MissionControl' && (
                <View style={[styles.activeDot, { backgroundColor: theme.accentAmber }]} />
              )}
            </View>
            <Text style={[styles.label, { color, fontFamily: isFocused ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}>
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
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
