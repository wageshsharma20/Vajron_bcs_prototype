import React, { createContext, useContext } from 'react';

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
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const layout = {
  radius: 8,
  radiusSm: 4,
  hairline: 1, 
} as const;

export type ColorTheme = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  hairline: string;
  overlay: string;
  
  statusGreen: string;
  statusGreenMuted: string;
  accentAmber: string;
  accentAmberMuted: string;
  accentRed: string;
  accentRedMuted: string;
};

export const lightTheme: ColorTheme = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceMuted: '#E9ECEF',
  textPrimary: '#000000',
  textSecondary: '#6C757D',
  hairline: '#E9ECEF',
  overlay: 'rgba(255, 255, 255, 0.85)',
  
  statusGreen: '#059669',
  statusGreenMuted: '#ECFDF5',
  
  accentAmber: '#D97706',
  accentAmberMuted: '#FFFBEB',
  
  accentRed: '#DC2626',
  accentRedMuted: '#FEF2F2',
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
