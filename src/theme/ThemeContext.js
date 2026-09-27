import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './colors';

const MODE_KEY = 'inbox-theme-mode';
const ThemeContext = createContext({ darkMode: false, toggleDarkMode: () => {}, theme: colors });

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((value) => setDarkMode(value === 'dark'))
      .catch(() => {});
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    AsyncStorage.setItem(MODE_KEY, next ? 'dark' : 'light').catch(() => {});
  };

  const theme = useMemo(() => darkMode ? {
    ...colors,
    background: '#0B1220',
    cardBackground: '#111C2E',
    surfaceVariant: '#1B2940',
    textPrimary: '#F1F5F9',
    textSecondary: '#A7B4C8',
    textMuted: '#8190A5',
    border: '#2B3A50',
    borderLight: '#243249',
  } : colors, [darkMode]);

  return <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
