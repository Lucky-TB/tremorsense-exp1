import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadSettings, saveSettings } from '@/utils/storage';
import type { AppSettings } from '@/types';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s: AppSettings) => {
      setPreferenceState(s.theme ?? 'auto');
      setLoaded(true);
    });
  }, []);

  const theme: ResolvedTheme =
    preference === 'auto' ? (systemScheme ?? 'light') : preference;

  const setPreference = async (p: ThemePreference) => {
    setPreferenceState(p);
    const current = await loadSettings();
    await saveSettings({ ...current, theme: p });
  };

  if (!loaded) {
    const initialTheme: ResolvedTheme = systemScheme ?? 'light';
    return (
      <ThemeContext.Provider
        value={{
          theme: initialTheme,
          preference: 'auto',
          setPreference: async (p) => {
            setPreferenceState(p);
            const current = await loadSettings();
            await saveSettings({ ...current, theme: p });
          },
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
