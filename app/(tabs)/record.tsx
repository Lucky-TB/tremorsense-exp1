// Record tab - Main recording interface

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecording } from '@/hooks/useRecording';
import { WaveformPreview } from '@/components/WaveformPreview';
import { loadSettings, saveSettings } from '@/utils/storage';
import { AppSettings, RecordingContext, SamplingRate } from '@/types';
import * as Haptics from 'expo-haptics';

export default function RecordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [context, setContext] = useState<RecordingContext>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const samplingRate = settings?.samplingRate || 'medium';
  const duration = settings?.recordingDuration || 10;

  const {
    isRecording,
    countdown,
    progress,
    error,
    readings,
    startRecording,
    stopRecording,
    isAvailable,
  } = useRecording(samplingRate, duration, { ...context, notes });

  const handleStart = async () => {
    if (!isAvailable) {
      Alert.alert('Sensors Unavailable', 'Accelerometer and gyroscope are not available on this device.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
  };

  const handleStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const session = await stopRecording();
    if (session) {
      Alert.alert('Recording Saved', 'Your recording has been saved successfully.');
      setNotes('');
      setContext({});
    }
  };

  const magnitudeData = readings.map(r => {
    const { x, y, z } = r.accelerometer;
    return Math.sqrt(x * x + y * y + z * z);
  });

  const backgroundColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#98989D' : '#6D6D70';
  const primaryColor = isDark ? '#4A9EFF' : '#007AFF';
  const dangerColor = '#FF3B30';

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: textColor }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Record Motion</Text>
          <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
            Hold your device steady and tap start
          </Text>
        </View>

      {/* Countdown */}
      {countdown !== null && (
        <View style={[styles.countdownContainer, { backgroundColor: cardColor }]}>
          <Text style={[styles.countdownText, { color: primaryColor }]}>{countdown}</Text>
        </View>
      )}

      {/* Live Preview */}
      {isRecording && (
        <View style={[styles.previewContainer, { backgroundColor: cardColor }]}>
          <Text style={[styles.previewTitle, { color: textColor }]}>Live Preview</Text>
          <WaveformPreview data={magnitudeData} />
        </View>
      )}

      {/* Progress Bar */}
      {isRecording && (
        <View style={[styles.progressContainer, { backgroundColor: cardColor }]}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress}%`, backgroundColor: primaryColor },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: secondaryTextColor }]}>
            {Math.round(progress)}% - {Math.round((duration * (100 - progress)) / 100)}s remaining
          </Text>
        </View>
      )}

      {/* Context Options */}
      <View style={[styles.contextContainer, { backgroundColor: cardColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Session Context (Optional)</Text>
        
        <View style={styles.contextRow}>
          <Text style={[styles.contextLabel, { color: textColor }]}>Caffeine consumed</Text>
          <Switch
            value={context.caffeine || false}
            onValueChange={(value) => setContext({ ...context, caffeine: value })}
            trackColor={{ false: '#3E3E42', true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.contextRow}>
          <Text style={[styles.contextLabel, { color: textColor }]}>Sleep deprived</Text>
          <Switch
            value={context.sleepDeprived || false}
            onValueChange={(value) => setContext({ ...context, sleepDeprived: value })}
            trackColor={{ false: '#3E3E42', true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.contextRow}>
          <Text style={[styles.contextLabel, { color: textColor }]}>Feeling stressed</Text>
          <Switch
            value={context.stress || false}
            onValueChange={(value) => setContext({ ...context, stress: value })}
            trackColor={{ false: '#3E3E42', true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TextInput
          style={[styles.notesInput, { backgroundColor: backgroundColor, color: textColor, borderColor: secondaryTextColor }]}
          placeholder="Add notes (optional)"
          placeholderTextColor={secondaryTextColor}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: dangerColor }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Record Button */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          {
            backgroundColor: isRecording ? dangerColor : primaryColor,
            opacity: isAvailable ? 1 : 0.5,
          },
        ]}
        onPress={isRecording ? handleStop : handleStart}
        disabled={!isAvailable}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {!isAvailable && (
        <Text style={[styles.warningText, { color: secondaryTextColor }]}>
          Sensors are not available on this device
        </Text>
      )}
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
    marginTop: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  loadingText: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 50,
  },
  countdownContainer: {
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '700',
    letterSpacing: -2,
  },
  previewContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  progressContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#3E3E42',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  contextContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  contextLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginTop: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  recordButton: {
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
