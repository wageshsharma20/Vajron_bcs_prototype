import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { lightTheme } from './src/theme';
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
    bodyLarge: { fontFamily: 'Inter_400Regular' },
    bodyMedium: { fontFamily: 'Inter_400Regular' },
    bodySmall: { fontFamily: 'Inter_400Regular' },
    labelLarge: { fontFamily: 'Inter_500Medium' },
    labelMedium: { fontFamily: 'Inter_500Medium' },
    labelSmall: { fontFamily: 'Inter_500Medium' },
    titleLarge: { fontFamily: 'Inter_600SemiBold' },
    titleMedium: { fontFamily: 'Inter_600SemiBold' },
    titleSmall: { fontFamily: 'Inter_600SemiBold' },
    headlineLarge: { fontFamily: 'Inter_700Bold' },
    headlineMedium: { fontFamily: 'Inter_700Bold' },
    headlineSmall: { fontFamily: 'Inter_700Bold' },
    displayLarge: { fontFamily: 'Inter_700Bold' },
    displayMedium: { fontFamily: 'Inter_700Bold' },
    displaySmall: { fontFamily: 'Inter_700Bold' },
  }
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      setFontsLoaded(true);
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
    <SafeAreaProvider>
      <PaperProvider theme={customPaperTheme}>
        <NavigationContainer>
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
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
