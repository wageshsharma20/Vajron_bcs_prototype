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
import DesignVariantSwitcher from './src/components/DesignVariantSwitcher';
import CustomTabBar from './src/components/CustomTabBar';


import MissionControlScreen_LayoutA from './src/screens/MissionControlScreen_LayoutA';
import MissionControlScreen_LayoutB from './src/screens/MissionControlScreen_LayoutB';
import MissionControlScreen_LayoutC from './src/screens/MissionControlScreen_LayoutC';
import MissionControlScreen_LayoutD from './src/screens/MissionControlScreen_LayoutD';
import MissionControlScreen_LayoutE from './src/screens/MissionControlScreen_LayoutE';
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
    background: '#F0F1F3', // Light gray background for web void
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
 * Sits inside the provider so the navigation and Paper themes follow the active
 * design variant; reading the palette statically left half the chrome on the
 * default whichever variant was selected.
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
          <Tab.Navigator
            tabBar={(props) => (
              <>
                <DesignVariantSwitcher />
                <CustomTabBar {...props} />
              </>
            )}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen name="FleetDashboard" component={FleetDashboardScreen} />
            <Tab.Screen name="MissionPlanner" component={MissionPlannerScreen} />
            
            <Tab.Screen name="MissionControl" component={MissionControlScreen} />
            <Tab.Screen name="LayoutA" component={MissionControlScreen_LayoutA} />
            <Tab.Screen name="LayoutB" component={MissionControlScreen_LayoutB} />
            <Tab.Screen name="LayoutC" component={MissionControlScreen_LayoutC} />
            <Tab.Screen name="LayoutD" component={MissionControlScreen_LayoutD} />
            <Tab.Screen name="LayoutE" component={MissionControlScreen_LayoutE} />

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
