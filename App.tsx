import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,


} from '@expo-google-fonts/noto-sans';

import { lightTheme, ThemeProvider, useTheme } from './src/theme';
import CustomTabBar from './src/components/CustomTabBar';

import FleetDashboardScreen from './src/screens/FleetDashboardScreen';
import MissionPlannerScreen from './src/screens/MissionPlannerScreen';
import MissionControlScreen from './src/screens/MissionControlScreen';
import FleetMaintenanceScreen from './src/screens/FleetMaintenanceScreen';

const Tab = createBottomTabNavigator();

const customPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightTheme.textPrimary,
    background: lightTheme.background,
    surface: lightTheme.surface,
    error: lightTheme.accentRed,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: { fontFamily: 'NotoSans_400Regular' },
    bodyMedium: { fontFamily: 'NotoSans_400Regular' },
    bodySmall: { fontFamily: 'NotoSans_400Regular' },
    labelLarge: { fontFamily: 'NotoSans_500Medium' },
    labelMedium: { fontFamily: 'NotoSans_500Medium' },
    labelSmall: { fontFamily: 'NotoSans_500Medium' },
    titleLarge: { fontFamily: 'NotoSans_600SemiBold' },
    titleMedium: { fontFamily: 'NotoSans_600SemiBold' },
    titleSmall: { fontFamily: 'NotoSans_600SemiBold' },
    headlineLarge: { fontFamily: 'NotoSans_700Bold' },
    headlineMedium: { fontFamily: 'NotoSans_700Bold' },
    headlineSmall: { fontFamily: 'NotoSans_700Bold' },
    displayLarge: { fontFamily: 'NotoSans_700Bold' },
    displayMedium: { fontFamily: 'NotoSans_700Bold' },
    displaySmall: { fontFamily: 'NotoSans_700Bold' },
  }
};

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // The void around the app on a wide browser window. Tinted with the
    // station's own pale green rather than a neutral grey, so an oversized
    // viewport frames the interface instead of interrupting it.
    background: lightTheme.surfaceMuted,
  },
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          NotoSans_400Regular,
          NotoSans_500Medium,
          NotoSans_600SemiBold,
          NotoSans_700Bold,
          // Public domain (CC0) — see assets/fonts/TypeLightSans-LICENSE-CC0.txt
          TypeLightSans: require('./assets/fonts/TypeLightSans.ttf'),

        });
      } finally {
        // Render either way. Holding on the spinner when a face fails to resolve
        // leaves the app on a blank screen with nothing to explain why.
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: lightTheme.background }]}>
        <ActivityIndicator size="large" color={lightTheme.accentAmber} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

/**
 * Sits inside the provider so the navigator's own chrome follows the active
 * layout — in particular where the tab bar is docked, which is a navigator
 * option and cannot be decided from inside the tab bar component.
 */
function AppShell() {
  const { theme } = useTheme();

  const paperTheme = {
    ...customPaperTheme,
    colors: {
      ...customPaperTheme.colors,
      primary: theme.brand,
      background: theme.background,
      surface: theme.surface,
      error: theme.accentRed,
    },
  };

  const navigationTheme = {
    ...navTheme,
    colors: { ...navTheme.colors, background: theme.background },
  };

  return (
    <SafeAreaProvider style={{ backgroundColor: theme.background }}>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          {/* Navigation is a rail on the right; the masthead spine is on the
              left, inside each screen. Both pieces of chrome are vertical, so
              the working area keeps the full height of the display. */}
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false, tabBarPosition: 'right' }}
          >
            <Tab.Screen name="FleetDashboard" component={FleetDashboardScreen} />
            <Tab.Screen name="MissionPlanner" component={MissionPlannerScreen} />
            <Tab.Screen name="MissionControl" component={MissionControlScreen} />
            <Tab.Screen name="FleetMaintenance" component={FleetMaintenanceScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
