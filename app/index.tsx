import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';

// For now: always show onboarding on app load (no persistence check)
export default function IndexScreen() {
  useEffect(() => {
    // Defer navigation until after Root Layout / navigator has mounted
    const id = setTimeout(() => {
      router.replace('/onboarding');
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#6B4EAA" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6B4EAA',
  },
});
