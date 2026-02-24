// Settings tab - Configuration and data management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSettings, SamplingRate } from '@/types';
import {
  loadSettings,
  saveSettings,
  clearAllSessions,
  exportSessionsAsJSON,
  exportSessionsAsCSV,
  loadAllSessions,
} from '@/utils/storage';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

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
      
      if (sessions.length === 0) {
        Alert.alert('No Data', 'There are no sessions to export.');
        return;
      }

      const fileUri = FileSystem.documentDirectory + 'tremorsense_export.json';
      await FileSystem.writeAsStringAsync(fileUri, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({
          message: json,
          title: 'TremorSense Export',
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
      console.error(error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportSessionsAsCSV();
      const sessions = await loadAllSessions();
      
      if (sessions.length === 0) {
        Alert.alert('No Data', 'There are no sessions to export.');
        return;
      }

      const fileUri = FileSystem.documentDirectory + 'tremorsense_export.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({
          message: csv,
          title: 'TremorSense Export',
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
      console.error(error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your recording sessions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllSessions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const backgroundColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#98989D' : '#6D6D70';
  const primaryColor = isDark ? '#4A9EFF' : '#007AFF';
  const dangerColor = '#FF3B30';

  const SamplingRateButton = ({ rate, label }: { rate: SamplingRate; label: string }) => (
    <TouchableOpacity
      style={[
        styles.rateButton,
        {
          backgroundColor: settings.samplingRate === rate ? primaryColor : 'transparent',
          borderColor: primaryColor,
        },
      ]}
      onPress={() => updateSettings({ samplingRate: rate })}
    >
      <Text
        style={[
          styles.rateButtonText,
          { color: settings.samplingRate === rate ? '#FFFFFF' : textColor },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const DurationButton = ({ duration, label }: { duration: number; label: string }) => (
    <TouchableOpacity
      style={[
        styles.rateButton,
        {
          backgroundColor: settings.recordingDuration === duration ? primaryColor : 'transparent',
          borderColor: primaryColor,
        },
      ]}
      onPress={() => updateSettings({ recordingDuration: duration })}
    >
      <Text
        style={[
          styles.rateButtonText,
          {
            color: settings.recordingDuration === duration ? '#FFFFFF' : textColor,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Settings</Text>
        </View>

        {/* Recording Settings */}
        <View style={[styles.section, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Recording Settings</Text>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Sampling Rate</Text>
            <View style={styles.buttonRow}>
              <SamplingRateButton rate="low" label="Low (20Hz)" />
              <SamplingRateButton rate="medium" label="Medium (50Hz)" />
              <SamplingRateButton rate="high" label="High (100Hz)" />
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Recording Duration</Text>
            <View style={styles.buttonRow}>
              <DurationButton duration={5} label="5s" />
              <DurationButton duration={10} label="10s" />
              <DurationButton duration={15} label="15s" />
              <DurationButton duration={30} label="30s" />
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Appearance</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Dark Mode</Text>
            <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
              Follows system settings
            </Text>
          </View>
        </View>

        {/* Data Management */}
        <View style={[styles.section, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Data Management</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportJSON}
          >
            <Text style={[styles.actionButtonText, { color: primaryColor }]}>
              Export as JSON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportCSV}
          >
            <Text style={[styles.actionButtonText, { color: primaryColor }]}>
              Export as CSV
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleClearData}
          >
            <Text style={[styles.actionButtonText, { color: dangerColor }]}>
              Clear All Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy & Ethics */}
        <View style={[styles.section, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Privacy & Ethics</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <Text style={[styles.actionButtonText, { color: primaryColor }]}>
              View Privacy & Ethics Information
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: cardColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
          <Text style={[styles.infoText, { color: secondaryTextColor }]}>
            TremorSense v1.0.0
          </Text>
          <Text style={[styles.infoText, { color: secondaryTextColor }]}>
            A motion tracking and visualization app
          </Text>
        </View>
      </ScrollView>

      {/* Privacy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Privacy & Ethics
            </Text>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
              <Text style={[styles.modalClose, { color: primaryColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={[styles.modalSection, { backgroundColor: cardColor }]}>
              <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                What This App Does
              </Text>
              <Text style={[styles.modalText, { color: textColor }]}>
                TremorSense measures motion using your device's built-in sensors (accelerometer
                and gyroscope). It records, stores, analyzes, and visualizes this motion data to
                help you observe patterns over time.
              </Text>
            </View>

            <View style={[styles.modalSection, { backgroundColor: cardColor }]}>
              <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                What This App Does NOT Do
              </Text>
              <Text style={[styles.modalText, { color: textColor }]}>
                • This app does NOT diagnose any medical condition{'\n'}
                • This app does NOT provide medical advice{'\n'}
                • This app does NOT predict or treat diseases{'\n'}
                • This app does NOT connect to any external servers or APIs{'\n'}
                • This app does NOT share your data with third parties
              </Text>
            </View>

            <View style={[styles.modalSection, { backgroundColor: cardColor }]}>
              <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                Data Privacy
              </Text>
              <Text style={[styles.modalText, { color: textColor }]}>
                All data is stored locally on your device using AsyncStorage. No data is sent to
                external servers. You can export or delete your data at any time through the
                Settings screen.
              </Text>
            </View>

            <View style={[styles.modalSection, { backgroundColor: cardColor }]}>
              <Text style={[styles.modalSectionTitle, { color: textColor }]}>
                Important Disclaimer
              </Text>
              <Text style={[styles.modalText, { color: dangerColor, fontWeight: '600' }]}>
                This app is for informational and observational purposes only. If you have concerns
                about your health, please consult with a qualified healthcare professional. This app
                should not be used as a substitute for professional medical advice, diagnosis, or
                treatment.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    marginTop: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    textAlign: 'center',
  },
  section: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  settingItem: {
    marginBottom: 28,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingDescription: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionButton: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#3E3E42',
  },
  dangerButton: {
    borderBottomWidth: 0,
    marginTop: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  infoText: {
    fontSize: 15,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3E3E42',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  modalText: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '400',
  },
});
