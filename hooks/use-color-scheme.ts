import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';

/** Returns app theme (respects Settings light/dark/auto). Use inside ThemeProvider. */
export function useColorScheme() {
  const system = useRNColorScheme();
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.theme;
  return system ?? 'light';
}
