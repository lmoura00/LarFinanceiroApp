import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces para tipagem
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
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

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
};

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