import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth as firebaseAuth } from '@/config/firebase';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const cardBg = isDark ? '#1A2428' : '#FFFFFF';
  const textPrimary = isDark ? '#E8E4DC' : '#1C1C1E';
  const textSecondary = isDark ? '#8A8A8E' : '#6D6D72';
  const inputBg = isDark ? '#0D0D0D' : '#F0EDE8';
  const inputBorder = isDark ? '#2A3438' : '#E5E5E0';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';
  const borderColor = isDark ? '#2A3438' : '#E5E5E0';

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (!firebaseAuth) {
      setError('Firebase is not configured. Add your Firebase keys to .env');
      triggerShake();
      return;
    }
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter your email and password.');
      triggerShake();
      return;
    }
    if (trimmedPassword.length < 6 && mode === 'signup') {
      setError('Password must be at least 6 characters.');
      triggerShake();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, trimmedPassword);
        router.replace('/profile-setup');
      } else {
        await signInWithEmailAndPassword(firebaseAuth, trimmedEmail, trimmedPassword);
        router.replace('/(tabs)/record');
      }
    } catch (e: unknown) {
      let message = 'Something went wrong. Try again.';
      if (e && typeof e === 'object' && 'code' in e) {
        const code = (e as { code: string }).code;
        switch (code) {
          case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
          case 'auth/user-not-found':
            message = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
          case 'auth/email-already-in-use':
            message = 'An account with this email already exists.';
            break;
          case 'auth/weak-password':
            message = 'Password is too weak. Use at least 6 characters.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts. Please try again later.';
            break;
          default:
            message = e && 'message' in e ? String((e as { message: string }).message) : message;
        }
      }
      setError(message);
      triggerShake();
      if (Platform.OS === 'web') {
        Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    router.replace('/(tabs)/record');
  };

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding')}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.5 }]}
          >
            <Text style={[styles.backArrow, { color: textPrimary }]}>{'\u2190'}</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              {mode === 'signin'
                ? 'Sign in to access your tremor data'
                : 'Start tracking your tremor patterns'}
            </Text>
          </View>

          {/* Firebase warning */}
          {!firebaseAuth && (
            <View style={[styles.warningBanner, { backgroundColor: isDark ? '#2A2418' : '#FFF3E0' }]}>
              <Text style={[styles.warningText, { color: isDark ? '#E8A44C' : '#E65100' }]}>
                Firebase not configured. Add keys to .env to enable authentication.
              </Text>
            </View>
          )}

          {/* Form */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: cardBg, transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: isDark ? '#0D0D0D' : '#F0EDE8' }]}>
              <Pressable
                onPress={() => { setMode('signin'); setError(null); }}
                style={[
                  styles.tab,
                  mode === 'signin' && [styles.tabActive, { backgroundColor: cardBg }],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signin' ? textPrimary : textSecondary },
                    mode === 'signin' && styles.tabTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setMode('signup'); setError(null); }}
                style={[
                  styles.tab,
                  mode === 'signup' && [styles.tabActive, { backgroundColor: cardBg }],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signup' ? textPrimary : textSecondary },
                    mode === 'signup' && styles.tabTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>EMAIL</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: emailFocused ? accent : inputBorder,
                  },
                ]}
                placeholder="name@example.com"
                placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>PASSWORD</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={passwordRef}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: passwordFocused ? accent : inputBorder,
                      paddingRight: 52,
                    },
                  ]}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter password'}
                  placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={[styles.eyeIcon, { color: textSecondary }]}>
                    {showPassword ? '\u25C9' : '\u25CE'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: isDark ? '#2A1A1A' : '#FFF0F0' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: accent },
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#0D0D0D" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <Text style={[styles.dividerText, { color: textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          {/* Guest */}
          <Pressable
            onPress={handleGuest}
            style={({ pressed }) => [
              styles.guestButton,
              { borderColor },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.guestButtonText, { color: textSecondary }]}>
              Continue as a guest
            </Text>
          </Pressable>
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
    paddingTop: 12,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  warningBanner: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#E85D5D',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  guestButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
