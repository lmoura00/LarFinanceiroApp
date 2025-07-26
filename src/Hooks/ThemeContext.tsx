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
  card: string;
  border: string;
  
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
    background: '#ffffff',
    text: '#121212',
    primary: '#007bff',
    secondary: '#888',
    card: '#f0f0f0',
    border: '#e0e0e0',
  },
  spacing: { s: width * 0.02, m: width * 0.04, l: width * 0.06, xl: width * 0.08 }, 
  fontSizes: { small: width * 0.03, medium: width * 0.04, large: width * 0.05, xLarge: width * 0.07 }, 
  borderRadius: { s: 4, m: 8, l: 12, xl: 16 },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#121212',
    text: '#ffffff',
    primary: '#007bff',
    secondary: '#aaa',
    card: '#1e1e1e',
    border: '#2a2a2a',
  },
  spacing: { s: width * 0.02, m: width * 0.04, l: width * 0.06, xl: width * 0.08 }, 
  fontSizes: { small: width * 0.03, medium: width * 0.04, large: width * 0.05, xLarge: width * 0.07 }, 
  borderRadius: { s: 4, m: 8, l: 12, xl: 16 },
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