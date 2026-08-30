import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LayoutGrid, Route, Radar, Wrench } from 'lucide-react-native';
import { useTheme, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Primary navigation: a rail down the right edge.
 *
 * The selected item is marked by a solid rule on the rail's inner edge, facing
 * the content it selects, plus a shift in weight and colour — so the current
 * section is never signalled by colour alone.
 *
 * The glyphs name the work rather than the furniture. A route line says a
 * planned sortie where a map pin only said "map"; a radar sweep says a live
 * picture where a broadcast mast only said "signal". Each is a thin,
 * single-weight outline at one size, which is what keeps four of them in a
 * column reading as one set.
 */
const ITEMS: Record<string, { icon: typeof LayoutGrid; label: string }> = {
  FleetDashboard: { icon: LayoutGrid, label: 'Fleet' },
  MissionPlanner: { icon: Route, label: 'Plan' },
  MissionControl: { icon: Radar, label: 'Live Ops' },
  FleetMaintenance: { icon: Wrench, label: 'Service' },
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, tokens, sp } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.rail,
        {
          width: tokens.navRailWidth,
          paddingTop: insets.top + sp(26),
          paddingBottom: insets.bottom + sp(20),
          backgroundColor: theme.brand,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const item = ITEMS[route.name] ?? { icon: LayoutGrid, label: route.name };
        const IconComponent = item.icon;
        const color = isFocused ? theme.onBrand : theme.onBrandMuted;

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

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={[styles.item, { paddingVertical: sp(15) }, { outlineStyle: 'none' } as any]}
          >
            {/* Marker on the inner edge, pointing back into the page. */}
            <View
              style={{
                width: tokens.rule.medium,
                height: '58%',
                alignSelf: 'flex-start',
                backgroundColor: isFocused ? theme.onBrand : 'transparent',
              }}
            />
            <View style={styles.body}>
              <View style={styles.iconWrap}>
                <IconComponent size={21} color={color} strokeWidth={isFocused ? 1.6 : 1.2} />
                {route.name === 'MissionControl' && (
                  <View
                    style={[styles.liveMark, { backgroundColor: theme.onBrand }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color,
                    fontFamily: isFocused ? typography.fonts.semiBold : typography.fonts.regular,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center', paddingBottom: sp(20) }}>
        <View style={{
          width: tokens.navRailWidth * 0.8,
          height: tokens.navRailWidth * 0.8,
          borderRadius: (tokens.navRailWidth * 0.8) / 2,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Local asset, not a hotlinked search-result thumbnail: the station
              runs on a Pi in the field with no guarantee of internet, and that
              URL was a Google CDN link that expires. */}
          <Image
            source={require('../../assets/images/dda-greens-logo.png')}
            style={{ width: '95%', height: '95%' }}
            resizeMode="contain"
            accessibilityLabel="DDA Greens"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  body: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 7,
  },
  liveMark: {
    // A square tick rather than a dot: the only round shape left in the app is
    // the record button, where a square would read as "stop".
    position: 'absolute',
    top: -3,
    right: -5,
    width: 4,
    height: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
