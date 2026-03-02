// Record tab - Start tremor check (UI only, respects light/dark theme)

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PURPLE = '#6B4EAA';
const WHITE = '#FFFFFF';

export default function RecordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#1a1520' : '#F5F2FA';
  const cardBg = isDark ? '#2a2433' : WHITE;
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const secondaryColor = isDark ? '#B8B0C4' : '#6D6D72';

  const handleStartCheck = () => {
    // Placeholder - no actual sensor logic
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: PURPLE }]}>TremorSense</Text>
            <Text style={[styles.subtitle, { color: secondaryColor }]}>
              Hold your phone steady. We’ll use the gyroscope and accelerometer to detect shaking
              from conditions like Parkinson’s, MS, or hyperthyroidism.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Check your hands</Text>
            <Text style={[styles.cardDesc, { color: secondaryColor }]}>
              Tap the button below to start the check. Keep the device still in your hand during the
              test.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleStartCheck}
            >
              <Text style={styles.buttonText}>Start checking process</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
    paddingBottom: 40,
  },
  inner: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
});
