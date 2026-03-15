import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth as firebaseAuth } from '@/config/firebase';

const PURPLE = '#6B4EAA';
const WHITE = '#FFFFFF';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#1a1520' : '#F5F2FA';
  const cardBg = isDark ? '#2a2433' : WHITE;
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const secondaryColor = isDark ? '#B8B0C4' : '#6D6D72';
  const inputBg = isDark ? '#1a1520' : '#E8E4F0';
  const borderColor = isDark ? '#3d3548' : '#E5E5EA';

  const handleSubmit = async () => {
    if (!firebaseAuth) {
      setError('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_API_KEY and EXPO_PUBLIC_FIREBASE_APP_ID to your .env file.');
      return;
    }
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter email and password.');
      return;
    }
    if (trimmedPassword.length < 6 && mode === 'signup') {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, trimmedPassword);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, trimmedEmail, trimmedPassword);
      }
      router.replace('/(tabs)/record');
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Something went wrong. Try again.';
      setError(message);
      if (Platform.OS === 'web') {
        Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: PURPLE }]}>TremorSense</Text>
            <Text style={[styles.subtitle, { color: secondaryColor }]}>
              {mode === 'signin'
                ? 'Sign in to track your tremor data and insights.'
                : 'Create an account to get started.'}
            </Text>
            {!firebaseAuth && (
              <View style={[styles.setupBanner, { backgroundColor: isDark ? '#2a2433' : '#E8E4F0' }]}>
                <Text style={[styles.setupBannerText, { color: secondaryColor }]}>
                  Add EXPO_PUBLIC_FIREBASE_API_KEY and EXPO_PUBLIC_FIREBASE_APP_ID to .env to enable sign in. See .env.example.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
              <Pressable
                onPress={() => {
                  setMode('signin');
                  setError(null);
                }}
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signin' ? PURPLE : secondaryColor },
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMode('signup');
                  setError(null);
                }}
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signup' ? PURPLE : secondaryColor },
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: textColor, borderColor },
              ]}
              placeholder="Email"
              placeholderTextColor={secondaryColor}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: textColor, borderColor },
              ]}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={secondaryColor}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              secureTextEntry
              editable={!loading}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? 'Sign In' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  setupBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
  },
  setupBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    minHeight: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
    marginBottom: -1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
  },
});
