import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ONBOARDING_KEY = '@tremorsense_onboarding_done';

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(20)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonsSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleNavigate = async (destination: '/sign-in') => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace(destination);
  };

  const handleGuest = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/record');
  };

  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const textPrimary = isDark ? '#E8E4DC' : '#1C1C1E';
  const textSecondary = isDark ? '#8A8A8E' : '#6D6D72';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';
  const accentBg = isDark ? '#1A2428' : '#EAF5F2';
  const borderColor = isDark ? '#2A3438' : '#D8E5E0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoSection,
            { opacity: logoFade, transform: [{ translateY: logoSlide }] },
          ]}
        >
          <View style={[styles.logoCircle, { backgroundColor: accentBg }]}>
            <Text style={[styles.logoIcon, { color: accent }]}>
              {'\u2261'}
            </Text>
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.contentSection,
            { opacity: contentFade, transform: [{ translateY: contentSlide }] },
          ]}
        >
          <Text style={[styles.appName, { color: textPrimary }]}>TremorSense</Text>
          <Text style={[styles.tagline, { color: textSecondary }]}>
            Clinical-grade tremor tracking{'\n'}powered by your phone's sensors
          </Text>

          <View style={styles.featureRow}>
            {[
              { icon: '\u25C9', label: 'Track' },
              { icon: '\u25B2', label: 'Analyze' },
              { icon: '\u2605', label: 'Insights' },
            ].map((item) => (
              <View key={item.label} style={[styles.featurePill, { backgroundColor: accentBg }]}>
                <Text style={[styles.featureIcon, { color: accent }]}>{item.icon}</Text>
                <Text style={[styles.featureLabel, { color: textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonSection,
            { opacity: buttonsFade, transform: [{ translateY: buttonsSlide }] },
          ]}
        >
          <Pressable
            onPress={() => handleNavigate('/sign-in')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: accent },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>

          <Pressable
            onPress={() => handleNavigate('/sign-in')}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>
              Sign In
            </Text>
          </Pressable>

          <Pressable onPress={handleGuest} style={({ pressed }) => [pressed && styles.buttonPressed]}>
            <Text style={[styles.guestText, { color: textSecondary }]}>
              Continue as a guest
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 36,
    fontWeight: '700',
  },
  contentSection: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  featureIcon: {
    fontSize: 12,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonSection: {
    gap: 12,
    paddingBottom: 8,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  guestText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
