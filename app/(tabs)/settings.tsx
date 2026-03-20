import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateDoctorReport } from '@/utils/reportGenerator';

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

  const handleGenerateReport = async () => {
    try {
      const sessions = await loadAllSessions();
      if (sessions.length === 0) {
        Alert.alert('No Data', 'Record at least one session before generating a report.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateDoctorReport(sessions, profile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Report Failed', 'Could not generate the report. Please try again.');
    }
  };

  const handleExportJSON = async () => {
    try {
      const sessions = await loadAllSessions();
      if (sessions.length === 0) { Alert.alert('No Data', 'No sessions to export.'); return; }
      const json = await exportSessionsAsJSON();
      const file = new File(Paths.cache, 'tremorsense_export.json');
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(file.uri); }
      else { await Share.share({ message: json, title: 'TremorSense Export' }); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('JSON export error:', e);
      Alert.alert('Export Failed', 'Could not export data.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const sessions = await loadAllSessions();
      if (sessions.length === 0) { Alert.alert('No Data', 'No sessions to export.'); return; }
      const csv = await exportSessionsAsCSV();
      const file = new File(Paths.cache, 'tremorsense_export.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(file.uri); }
      else { await Share.share({ message: csv, title: 'TremorSense Export' }); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('CSV export error:', e);
      Alert.alert('Export Failed', 'Could not export data.');
    }
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
  const subtleBg = isDark ? '#141C20' : '#EDEDEA';

  const userName = profile?.name || 'User';
  const userEmail = auth?.currentUser?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  const themeLabel = preference === 'auto' ? 'System' : preference === 'dark' ? 'Dark' : 'Light';
  const themeIcon = preference === 'dark' ? 'moon' : preference === 'light' ? 'sunny' : 'phone-portrait-outline';

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
        {/* Profile Hero */}
        <View style={styles.profileHero}>
          <View style={[styles.avatarRing, { borderColor: accent + '30' }]}>
            <View style={[styles.profileAvatar, { backgroundColor: accent }]}>
              <Text style={styles.profileInitial}>{initial}</Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: textColor }]}>{userName}</Text>
          {userEmail ? (
            <Text style={[styles.profileEmail, { color: secondaryColor }]}>{userEmail}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.editProfileButton,
              { borderColor: accent },
              pressed && { opacity: 0.7 },
            ]}
            onPress={openEditProfile}
          >
            <Ionicons name="pencil-outline" size={14} color={accent} />
            <Text style={[styles.editProfileText, { color: accent }]}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Doctor Report */}
        <Text style={[styles.sectionLabel, { color: secondaryColor }]}>DOCTOR REPORT</Text>
        <Pressable
          style={({ pressed }) => [
            styles.reportCard,
            { backgroundColor: cardBg },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleGenerateReport}
        >
          <View style={[styles.reportIconCircle, { backgroundColor: accent + '15' }]}>
            <Ionicons name="document-text" size={24} color={accent} />
          </View>
          <View style={styles.reportTextWrap}>
            <Text style={[styles.reportTitle, { color: textColor }]}>Generate PDF Report</Text>
            <Text style={[styles.reportSubtitle, { color: secondaryColor }]}>
              Professional tremor history report to share with your healthcare provider
            </Text>
          </View>
          <View style={[styles.reportArrow, { backgroundColor: accent }]}>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Raw Data Export */}
        <Text style={[styles.sectionLabel, { color: secondaryColor }]}>RAW DATA</Text>
        <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
          <MenuRow
            icon="code-slash-outline"
            label="Export JSON"
            subtitle="Full session data"
            onPress={handleExportJSON}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
          />
          <MenuRow
            icon="grid-outline"
            label="Export CSV"
            subtitle="Spreadsheet format"
            onPress={handleExportCSV}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
            last
          />
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionLabel, { color: secondaryColor }]}>PREFERENCES</Text>
        <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
          <MenuRow
            icon="options-outline"
            label="Scan Settings"
            subtitle="Sampling rate & duration"
            onPress={() => setScanSettingsVisible(true)}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
          />
          <MenuRow
            icon={themeIcon as any}
            label="Appearance"
            subtitle={themeLabel}
            onPress={() => {
              const next: ThemePreference = preference === 'light' ? 'dark' : preference === 'dark' ? 'auto' : 'light';
              setPreference(next);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
            last
          />
        </View>

        {/* About Section */}
        <Text style={[styles.sectionLabel, { color: secondaryColor }]}>ABOUT</Text>
        <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy & Ethics"
            subtitle="How your data is handled"
            onPress={() => setPrivacyModalVisible(true)}
            textColor={textColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
            last
          />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionLabel, { color: secondaryColor }]}>DANGER ZONE</Text>
        <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
          <MenuRow
            icon="trash-outline"
            label="Clear All Data"
            subtitle="Permanently delete all sessions"
            onPress={handleClearData}
            textColor={dangerColor}
            secondaryColor={secondaryColor}
            borderColor={borderColor}
            accent={accent}
            danger
          />
          <Pressable
            style={({ pressed }) => [styles.logoutRow, { borderTopWidth: 0.5, borderTopColor: borderColor }, pressed && { opacity: 0.7 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={dangerColor} />
            <Text style={[styles.logoutText, { color: dangerColor }]}>Log Out</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: secondaryColor }]}>TremorSense v1.0.0</Text>
          <View style={[styles.footerDot, { backgroundColor: secondaryColor + '40' }]} />
          <Text style={[styles.versionText, { color: secondaryColor }]}>Made with care</Text>
        </View>
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
                <View style={[styles.avatarRing, { borderColor: accent + '30' }]}>
                  <View style={[styles.editAvatar, { backgroundColor: accent }]}>
                    <Text style={styles.editAvatarLetter}>
                      {editName.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Personal Section */}
              <Text style={[styles.sectionLabel, { color: secondaryColor, marginLeft: 4 }]}>PERSONAL</Text>
              <View style={[styles.editCard, { backgroundColor: cardBg }]}>
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
                      <Ionicons name="checkmark-circle" size={20} color={accent} style={styles.editCheckIcon} />
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

                <View style={[styles.editInputGroup, { marginBottom: 0 }]}>
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

              {/* Email (read-only) */}
              {userEmail ? (
                <>
                  <Text style={[styles.sectionLabel, { color: secondaryColor, marginLeft: 4 }]}>ACCOUNT</Text>
                  <View style={[styles.editCard, { backgroundColor: cardBg }]}>
                    <View style={[styles.editInputGroup, { marginBottom: 0 }]}>
                      <Text style={[styles.editFieldLabel, { color: secondaryColor }]}>EMAIL</Text>
                      <View style={styles.editInputRow}>
                        <TextInput
                          style={[styles.editInput, { backgroundColor: inputBg, color: secondaryColor, borderColor: inputBorder }]}
                          value={userEmail}
                          editable={false}
                        />
                        <Ionicons name="lock-closed-outline" size={18} color={secondaryColor} style={styles.editCheckIcon} />
                      </View>
                    </View>
                  </View>
                </>
              ) : null}

              {/* Save button */}
              <Pressable
                onPress={handleSaveProfile}
                style={({ pressed }) => [
                  styles.modalSaveButton,
                  { backgroundColor: accent },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
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
            <Text style={[styles.sectionLabel, { color: secondaryColor, marginLeft: 4 }]}>SAMPLING RATE</Text>
            <View style={[styles.editCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.settingDescription, { color: secondaryColor }]}>
                Higher rates capture more detail but use more battery.
              </Text>
              <View style={styles.pillRow}>
                {([
                  { rate: 'low' as SamplingRate, label: '20 Hz', desc: 'Battery saver' },
                  { rate: 'medium' as SamplingRate, label: '50 Hz', desc: 'Recommended' },
                  { rate: 'high' as SamplingRate, label: '100 Hz', desc: 'High detail' },
                ]).map(({ rate, label, desc }) => {
                  const isActive = settings.samplingRate === rate;
                  return (
                    <Pressable
                      key={rate}
                      style={[
                        styles.settingPill,
                        {
                          backgroundColor: isActive ? accent : 'transparent',
                          borderColor: isActive ? accent : borderColor,
                        },
                      ]}
                      onPress={() => updateSettings({ samplingRate: rate })}
                    >
                      <Text style={[styles.settingPillLabel, { color: isActive ? '#FFFFFF' : textColor }]}>
                        {label}
                      </Text>
                      <Text style={[styles.settingPillDesc, { color: isActive ? '#FFFFFF99' : secondaryColor }]}>
                        {desc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: secondaryColor, marginLeft: 4 }]}>DURATION</Text>
            <View style={[styles.editCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.settingDescription, { color: secondaryColor }]}>
                Longer scans give more accurate readings.
              </Text>
              <View style={styles.pillRow}>
                {[5, 10, 15, 30].map((d) => {
                  const isActive = settings.recordingDuration === d;
                  return (
                    <Pressable
                      key={d}
                      style={[
                        styles.durationPill,
                        {
                          backgroundColor: isActive ? accent : 'transparent',
                          borderColor: isActive ? accent : borderColor,
                        },
                      ]}
                      onPress={() => updateSettings({ recordingDuration: d })}
                    >
                      <Text style={[styles.durationPillLabel, { color: isActive ? '#FFFFFF' : textColor }]}>
                        {d}s
                      </Text>
                    </Pressable>
                  );
                })}
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
            <PrivacySection title="WHAT THIS APP DOES" icon="analytics-outline" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor} accent={accent}
              text="TremorSense measures motion using your device's built-in sensors (accelerometer and gyroscope). It records, stores, analyzes, and visualizes this motion data to help you observe patterns over time."
            />
            <PrivacySection title="WHAT THIS APP DOES NOT DO" icon="close-circle-outline" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor} accent={accent}
              text="This app does NOT diagnose any medical condition, provide medical advice, predict or treat diseases, connect to external servers, or share your data with third parties."
            />
            <PrivacySection title="DATA PRIVACY" icon="lock-closed-outline" cardBg={cardBg} secondaryColor={secondaryColor} textColor={textColor} accent={accent}
              text="All data is stored locally on your device using AsyncStorage. No data is sent to external servers. You can export or delete your data at any time through Settings."
            />
            <PrivacySection title="IMPORTANT DISCLAIMER" icon="warning-outline" cardBg={cardBg} secondaryColor={dangerColor} textColor={textColor} accent={accent}
              text="This app is for informational and observational purposes only. If you have concerns about your health, please consult with a qualified healthcare professional."
              highlight
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, subtitle, onPress, textColor, secondaryColor, borderColor, accent, last, danger }: {
  icon: string; label: string; subtitle?: string; onPress: () => void; textColor: string; secondaryColor: string; borderColor: string; accent: string; last?: boolean; danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, !last && { borderBottomWidth: 0.5, borderBottomColor: borderColor }, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconCircle, { backgroundColor: (danger ? '#E85D5D' : accent) + '12' }]}>
          <Ionicons name={icon as any} size={20} color={danger ? '#E85D5D' : accent} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={[styles.menuRowLabel, { color: textColor }]}>{label}</Text>
          {subtitle ? <Text style={[styles.menuRowSub, { color: secondaryColor }]}>{subtitle}</Text> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={secondaryColor + '80'} />
    </Pressable>
  );
}

function PrivacySection({ title, text, icon, cardBg, secondaryColor, textColor, accent, highlight }: {
  title: string; text: string; icon: string; cardBg: string; secondaryColor: string; textColor: string; accent: string; highlight?: boolean;
}) {
  return (
    <View style={[styles.privacyCard, { backgroundColor: cardBg, borderLeftColor: highlight ? '#E85D5D' : accent, borderLeftWidth: 3 }]}>
      <View style={styles.privacyHeader}>
        <Ionicons name={icon as any} size={16} color={secondaryColor} />
        <Text style={[styles.privacyLabel, { color: secondaryColor }]}>{title}</Text>
      </View>
      <Text style={[styles.privacyText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerSide: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15 },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 8,
  },

  // Profile hero
  profileHero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 8,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Report card
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  reportIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTextWrap: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  reportSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  reportArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Menu section
  menuSection: {
    borderRadius: 16,
    overflow: 'hidden',
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
    flex: 1,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuRowSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },

  // Logout
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginBottom: 8,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '400',
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
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSaveText: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },

  // Edit profile modal
  editAvatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  editAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarLetter: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  editCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  editInputGroup: {
    marginBottom: 18,
  },
  editFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 2,
  },
  editInputRow: {
    position: 'relative',
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: 12,
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
    borderRadius: 12,
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
    marginTop: 8,
    marginBottom: 40,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Scan settings
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingPill: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
  },
  settingPillLabel: { fontSize: 15, fontWeight: '600' },
  settingPillDesc: { fontSize: 11, fontWeight: '400', marginTop: 2 },
  durationPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },
  durationPillLabel: { fontSize: 15, fontWeight: '600' },

  // Privacy
  privacyCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  privacyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  privacyText: { fontSize: 15, lineHeight: 24 },
});
