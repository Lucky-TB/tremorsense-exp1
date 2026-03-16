import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';

export function useColorScheme() {
  const system = useRNColorScheme();
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.theme;
  return system ?? 'light';
}
