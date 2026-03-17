import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { AppSettings, SamplingRate, UserProfile } from '@/types';
import {
  loadSettings,
  saveSettings,
  clearAllSessions,
  exportSessionsAsJSON,
  exportSessionsAsCSV,
  loadAllSessions,
  loadProfile,
  saveProfile,
} from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [scanSettingsVisible, setScanSettingsVisible] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBirthday, setEditBirthday] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
    loadProfile().then(setProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile);
    }, [])
  );

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExportJSON = async () => {
    try {
      const json = await exportSessionsAsJSON();
      const sessions = await loadAllSessions();
      if (sessions.length === 0) { Alert.alert('No Data', 'No sessions to export.'); return; }
      const fileUri = FileSystem.documentDirectory + 'tremorsense_export.json';
      await FileSystem.writeAsStringAsync(fileUri, json);
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri); }
      else { await Share.share({ message: json, title: 'TremorSense Export' }); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Export Failed', 'Could not export data.'); }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportSessionsAsCSV();
      const sessions = await loadAllSessions();
      if (sessions.length === 0) { Alert.alert('No Data', 'No sessions to export.'); return; }
      const fileUri = FileSystem.documentDirectory + 'tremorsense_export.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv);
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri); }
      else { await Share.share({ message: csv, title: 'TremorSense Export' }); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert('Export Failed', 'Could not export data.'); }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          if (auth) await signOut(auth);
          router.replace('/sign-in');
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllSessions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'All data cleared.');
          },
        },
      ]
    );
  };

  const openEditProfile = () => {
    setEditName(profile?.name || '');
    setEditGender(profile?.gender || '');
    setEditBirthday(profile?.birthday || '');
    setEditProfileVisible(true);
  };

  const formatBirthday = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);
    setEditBirthday(formatted);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    const updatedProfile: UserProfile = {
      name: trimmedName,
      gender: editGender,
      birthday: editBirthday,
    };
    await saveProfile(updatedProfile);
    setProfile(updatedProfile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditProfileVisible(false);
  };

  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const cardBg = isDark ? '#1A2428' : '#FFFFFF';
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const secondaryColor = isDark ? '#8A8A8E' : '#6D6D72';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';
  const borderColor = isDark ? '#2A3438' : '#E5E5E0';
  const inputBg = isDark ? '#0D0D0D' : '#F0EDE8';
  const inputBorder = isDark ? '#2A3438' : '#E5E5E0';
  const dangerColor = '#E85D5D';

  const userName = profile?.name || 'User';
  const userEmail = auth?.currentUser?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: secondaryColor }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerSide} />
        <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
          <View style={[styles.profileAvatar, { backgroundColor: accent }]}>
            <Text style={styles.profileInitial}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: textColor }]}>{userName}</Text>
            {userEmail ? (
              <Text style={[styles.profileEmail, { color: secondaryColor }]}>{userEmail}</Text>
            ) : null}
          </View>
        </View>

        {/* Edit Profile Button */}
        <Pressable
          style={({ pressed }) => [
            styles.editProfileButton,
            { backgroundColor: accent },
            pressed && { opacity: 0.85 },
          ]}
          onPress={openEditProfile}
        >
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </Pressable>

        {/* Menu Items */}
        <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
          <MenuRow
            icon="download-outline"
            label="Export Data (JSON)"
            onPress={handleExportJSON}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
          />
          <MenuRow
            icon="document-text-outline"
            label="Export Data (CSV)"
            onPress={handleExportCSV}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
          />
          <MenuRow
            icon="settings-outline"
            label="Scan Settings"
            onPress={() => setScanSettingsVisible(true)}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy & Ethics"
            onPress={() => setPrivacyModalVisible(true)}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
          />
          <MenuRow
            icon="color-palette-outline"
            label={`Theme: ${preference === 'auto' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'}`}
            onPress={() => {
              const next: ThemePreference = preference === 'light' ? 'dark' : preference === 'dark' ? 'auto' : 'light';
              setPreference(next);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
          />
          <MenuRow
            icon="trash-outline"
            label="Clear All Data"
            onPress={handleClearData}
            textColor={dangerColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            last
            danger
          />
        </View>

        {/* Log out */}
        <Pressable
          style={({ pressed }) => [styles.logoutRow, { backgroundColor: cardBg }, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={dangerColor} />
          <Text style={[styles.logoutText, { color: dangerColor }]}>Log out</Text>
        </Pressable>

        {/* Version */}
        <Text style={[styles.versionText, { color: secondaryColor }]}>TremorSense v1.0.0</Text>
      </ScrollView>

      {/* ===== Edit Profile Modal ===== */}
      <Modal visible={editProfileVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditProfileVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setEditProfileVisible(false)} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: textColor }]}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile} hitSlop={12}>
              <Text style={[styles.modalSaveText, { color: accent }]}>Save</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Avatar */}
              <View style={styles.editAvatarSection}>
                <View style={[styles.editAvatar, { backgroundColor: accent }]}>
                  <Text style={styles.editAvatarLetter}>
                    {editName.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              </View>

              {/* Personal Section */}
              <View style={[styles.editCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.editSectionLabel, { color: secondaryColor }]}>Personal</Text>

                <View style={styles.editInputGroup}>
                  <Text style={[styles.editFieldLabel, { color: secondaryColor }]}>NAME</Text>
                  <View style={styles.editInputRow}>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Your name"
                      placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                      autoCapitalize="words"
                    />
                    {editName.trim().length > 0 && (
                      <Ionicons name="checkmark" size={20} color={accent} style={styles.editCheckIcon} />
                    )}
                  </View>
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={[styles.editFieldLabel, { color: secondaryColor }]}>GENDER</Text>
                  <View style={styles.editGenderRow}>
                    {GENDER_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.editGenderPill,
                          {
                            backgroundColor: editGender === opt ? accent : 'transparent',
                            borderColor: editGender === opt ? accent : inputBorder,
                          },
                        ]}
                        onPress={() => setEditGender(opt)}
                      >
                        <Text style={[styles.editGenderText, { color: editGender === opt ? '#FFFFFF' : textColor }]}>
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={[styles.editFieldLabel, { color: secondaryColor }]}>BIRTHDAY</Text>
                  <View style={styles.editInputRow}>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: inputBg, color: textColor, borderColor: inputBorder }]}
                      value={editBirthday}
                      onChangeText={formatBirthday}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <Ionicons name="calendar-outline" size={20} color={secondaryColor} style={styles.editCheckIcon} />
                  </View>
                </View>
              </View>

              {/* Email & Password (read-only display) */}
              {userEmail ? (
                <View style={[styles.editCard, { backgroundColor: cardBg }]}>
                  <Text style={[styles.editSectionLabel, { color: secondaryColor }]}>Email</Text>
                  <View style={styles.editInputGroup}>
                    <View style={styles.editInputRow}>
                      <TextInput
                        style={[styles.editInput, { backgroundColor: inputBg, color: secondaryColor, borderColor: inputBorder }]}
                        value={userEmail}
                        editable={false}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Save button inside modal */}
              <Pressable
                onPress={handleSaveProfile}
                style={({ pressed }) => [
                  styles.modalSaveButton,
                  { backgroundColor: accent },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ===== Scan Settings Modal ===== */}
      <Modal visible={scanSettingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setScanSettingsVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setScanSettingsVisible(false)} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: textColor }]}>Scan Settings</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={[styles.editCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.editSectionLabel, { color: secondaryColor }]}>Sampling Rate</Text>
              <View style={styles.pillRow}>
                {([
                  { rate: 'low' as SamplingRate, label: '20Hz' },
                  { rate: 'medium' as SamplingRate, label: '50Hz' },
                  { rate: 'high' as SamplingRate, label: '100Hz' },
                ]).map(({ rate, label }) => (
                  <Pressable
                    key={rate}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: settings.samplingRate === rate ? accent : 'transparent',
                        borderColor: settings.samplingRate === rate ? accent : borderColor,
                      },
                    ]}
                    onPress={() => updateSettings({ samplingRate: rate })}
                  >
                    <Text style={[styles.pillText, { color: settings.samplingRate === rate ? '#FFFFFF' : textColor }]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.editCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.editSectionLabel, { color: secondaryColor }]}>Duration</Text>
              <View style={styles.pillRow}>
                {[5, 10, 15, 30].map((d) => (
                  <Pressable
                    key={d}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: settings.recordingDuration === d ? accent : 'transparent',
                        borderColor: settings.recordingDuration === d ? accent : borderColor,
                      },
                    ]}
                    onPress={() => updateSettings({ recordingDuration: d })}
                  >
                    <Text style={[styles.pillText, { color: settings.recordingDuration === d ? '#FFFFFF' : textColor }]}>
                      {d}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ===== Privacy Modal ===== */}
      <Modal visible={privacyModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setPrivacyModalVisible(false)} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: textColor }]}>Privacy & Ethics</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <PrivacySection title="WHAT THIS APP DOES" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor}
              text="TremorSense measures motion using your device's built-in sensors (accelerometer and gyroscope). It records, stores, analyzes, and visualizes this motion data to help you observe patterns over time."
            />
            <PrivacySection title="WHAT THIS APP DOES NOT DO" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor}
              text="This app does NOT diagnose any medical condition, provide medical advice, predict or treat diseases, connect to external servers, or share your data with third parties."
            />
            <PrivacySection title="DATA PRIVACY" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor}
              text="All data is stored locally on your device using AsyncStorage. No data is sent to external servers. You can export or delete your data at any time through Settings."
            />
            <PrivacySection title="IMPORTANT DISCLAIMER" cardBg={cardBg} secondaryColor={secondaryColor} textColor={dangerColor}
              text="This app is for informational and observational purposes only. If you have concerns about your health, please consult with a qualified healthcare professional."
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress, textColor, secondaryColor, borderColor, last, danger }: {
  icon: string; label: string; onPress: () => void; textColor: string; secondaryColor: string; borderColor: string; last?: boolean; danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, !last && { borderBottomWidth: 0.5, borderBottomColor: borderColor }, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconCircle, { backgroundColor: (danger ? '#E85D5D' : secondaryColor) + '15' }]}>
          <Ionicons name={icon as any} size={20} color={danger ? textColor : secondaryColor} />
        </View>
        <Text style={[styles.menuRowLabel, { color: textColor }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={secondaryColor} />
    </Pressable>
  );
}

function PrivacySection({ title, text, cardBg, secondaryColor, textColor }: {
  title: string; text: string; cardBg: string; secondaryColor: string; textColor: string;
}) {
  return (
    <View style={[styles.privacyCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.privacyLabel, { color: secondaryColor }]}>{title}</Text>
      <Text style={[styles.privacyText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerSide: { width: 40 },
  headerTitle: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15 },

  // Profile card
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    paddingBottom: 16,
    marginBottom: 0,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
  },

  // Edit profile button
  editProfileButton: {
    marginHorizontal: 40,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Menu section
  menuSection: {
    borderRadius: 16,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Logout
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },

  // Modal shared
  modalContainer: { flex: 1, paddingTop: 60 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalSaveText: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },

  // Edit profile modal
  editAvatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  editAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarLetter: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  editSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  editInputGroup: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  editInputRow: {
    position: 'relative',
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    paddingRight: 44,
  },
  editCheckIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  editGenderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editGenderPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  editGenderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 40,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Scan settings pills
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  // Privacy
  privacyCard: { borderRadius: 16, padding: 18, marginBottom: 12 },
  privacyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  privacyText: { fontSize: 15, lineHeight: 24 },
});
