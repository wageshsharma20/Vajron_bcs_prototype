import React, { createContext, useContext, useState } from 'react';

export const typography = {
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  tabularNums: ['tabular-nums'] as const,
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 26,
    xxl: 34,
  }
} as any;

export type ColorTheme = {
  background: string;
  surface: string;
  surfaceLight: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  overlay: string;
  accentTeal: string;
  accentAmber: string;
  accentRed: string;
  statusGreen: string;
};



export const lightTheme: ColorTheme = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceLight: '#E9ECEF',
  textPrimary: '#000000',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  overlay: 'rgba(255, 255, 255, 0.8)',
  accentTeal: '#F97316',
  accentAmber: '#D97706', // amber-600 for better contrast on white
  accentRed: '#DC2626',
  statusGreen: '#059669',
};

type ThemeContextType = {
  theme: ColorTheme;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeContext.Provider value={{ theme: lightTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
