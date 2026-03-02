import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * Uses app theme (Settings light/dark) when inside ThemeProvider.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const system = useRNColorScheme();
  const ctx = useContext(ThemeContext);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (ctx) return ctx.theme;
  if (hasHydrated) return system ?? 'light';
  return 'light';
}
