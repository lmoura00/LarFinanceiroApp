import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Appearance, ColorSchemeName, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface ThemeSizes {
  s: number;
  m: number;
  l: number;
  xl: number;
}

interface ThemeFontSizes {
  small: number;
  medium: number;
  large: number;
  xLarge: number;
}

interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  card: string;
  border: string;
  success: string;
  danger: string;
}

interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: ThemeSizes;
  fontSizes: ThemeFontSizes;
  borderRadius: ThemeSizes;
}

const { width, height } = Dimensions.get('window');

const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F7F9FC',
    text: '#2D3748',
    primary: '#4A90E2',
    secondary: '#718096',
    accent: '#5DADE2',
    card: '#FFFFFF',
    border: '#E2E8F0',
    success: '#38A169',
    danger: '#E53E3E',
  },
  spacing: { s: width * 0.02, m: width * 0.04, l: width * 0.06, xl: width * 0.08 },
  fontSizes: { small: width * 0.03, medium: width * 0.04, large: width * 0.05, xLarge: width * 0.07 },
  borderRadius: { s: 8, m: 12, l: 16, xl: 20 },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#1A202C',
    text: '#E2E8F0',
    primary: '#4A90E2',
    secondary: '#A0AEC0',
    accent: '#5DADE2',
    card: '#2D3748',
    border: '#4A5568',
    success: '#48BB78',
    danger: '#F56565',
  },
  spacing: { s: width * 0.02, m: width * 0.04, l: width * 0.06, xl: width * 0.08 },
  fontSizes: { small: width * 0.03, medium: width * 0.04, large: width * 0.05, xLarge: width * 0.07 },
  borderRadius: { s: 8, m: 12, l: 16, xl: 20 },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(darkTheme);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme) {
        setTheme(savedTheme === 'dark' ? darkTheme : lightTheme);
      } else {
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === 'dark' ? darkTheme : lightTheme);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme.dark ? lightTheme : darkTheme;
    setTheme(newTheme);
    await AsyncStorage.setItem('userTheme', newTheme.dark ? 'dark' : 'light');
  };

  const value = { theme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};