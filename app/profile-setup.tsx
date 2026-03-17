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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveProfile } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [saving, setSaving] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const cardBg = isDark ? '#1A2428' : '#FFFFFF';
  const textPrimary = isDark ? '#E8E4DC' : '#1C1C1E';
  const textSecondary = isDark ? '#8A8A8E' : '#6D6D72';
  const inputBg = isDark ? '#0D0D0D' : '#F0EDE8';
  const inputBorder = isDark ? '#2A3438' : '#E5E5E0';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const formatBirthday = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);
    setBirthday(formatted);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    if (!gender) {
      Alert.alert('Gender Required', 'Please select your gender.');
      return;
    }
    if (birthday.length < 10) {
      Alert.alert('Birthday Required', 'Please enter your full birthday (MM/DD/YYYY).');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({ name: trimmedName, gender, birthday });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/record');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>Set Up Your Profile</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Tell us a bit about yourself
            </Text>
          </View>

          {/* Avatar Preview */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Name */}
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Personal</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>NAME</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: inputBorder }]}
                  placeholder="Your name"
                  placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {name.trim().length > 0 && (
                  <Ionicons name="checkmark" size={20} color={accent} style={styles.checkIcon} />
                )}
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>GENDER</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.genderPill,
                      {
                        backgroundColor: gender === opt ? accent : 'transparent',
                        borderColor: gender === opt ? accent : inputBorder,
                      },
                    ]}
                    onPress={() => {
                      setGender(opt);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        { color: gender === opt ? '#FFFFFF' : textPrimary },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Birthday */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>BIRTHDAY</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: inputBorder }]}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                  value={birthday}
                  onChangeText={formatBirthday}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Ionicons name="calendar-outline" size={20} color={textSecondary} style={styles.checkIcon} />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: accent },
              pressed && { opacity: 0.8 },
              saving && { opacity: 0.65 },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Continue'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    paddingRight: 44,
  },
  checkIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
