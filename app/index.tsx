import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function IndexScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const id = setTimeout(() => {
      router.replace('/onboarding');
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={[styles.centered, { backgroundColor: isDark ? '#0D0D0D' : '#F5F5F0' }]}>
      <ActivityIndicator size="large" color={isDark ? '#5CC5AB' : '#2D9B8A'} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
