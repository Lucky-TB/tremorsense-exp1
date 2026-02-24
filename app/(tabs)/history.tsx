// History tab - List of all recording sessions

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RecordingSession } from '@/types';
import { loadAllSessions, deleteSession, deleteSessions } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RecordingSession | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    const loaded = await loadAllSessions();
    setSessions(loaded.sort((a, b) => b.timestamp - a.timestamp));
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleSessionPress = (session: RecordingSession) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(session.id)) {
        newSelected.delete(session.id);
      } else {
        newSelected.add(session.id);
      }
      setSelectedIds(newSelected);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setSelectedSession(session);
      setModalVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleDelete = (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            await loadSessions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    Alert.alert(
      'Delete Sessions',
      `Are you sure you want to delete ${selectedIds.size} session(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSessions(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            await loadSessions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const backgroundColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#98989D' : '#6D6D70';
  const primaryColor = isDark ? '#4A9EFF' : '#007AFF';
  const dangerColor = '#FF3B30';

  const renderSession = ({ item }: { item: RecordingSession }) => {
    const date = new Date(item.timestamp);
    const isSelected = selectedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          {
            backgroundColor: isSelected ? primaryColor + '20' : cardColor,
            borderColor: isSelected ? primaryColor : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
        onPress={() => handleSessionPress(item)}
        onLongPress={() => {
          if (!isSelectionMode) {
            toggleSelectionMode();
            setSelectedIds(new Set([item.id]));
          }
        }}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionDate, { color: textColor }]}>
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.sessionDuration, { color: secondaryTextColor }]}>
              {item.duration}s • {item.magnitude.length} samples
            </Text>
          </View>
          {!isSelectionMode && (
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteButton}
            >
              <Text style={[styles.deleteButtonText, { color: dangerColor }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Amplitude</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {item.stats.meanAmplitude.toFixed(3)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Variability</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {item.stats.variability.toFixed(3)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Peak</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {item.stats.peakAmplitude.toFixed(3)}
            </Text>
          </View>
        </View>

        {item.context && (
          <View style={styles.contextTags}>
            {item.context.caffeine && (
              <View style={[styles.tag, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.tagText, { color: primaryColor }]}>Caffeine</Text>
              </View>
            )}
            {item.context.sleepDeprived && (
              <View style={[styles.tag, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.tagText, { color: primaryColor }]}>Sleep Deprived</Text>
              </View>
            )}
            {item.context.stress && (
              <View style={[styles.tag, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.tagText, { color: primaryColor }]}>Stress</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>History</Text>
        <View style={styles.headerActions}>
          {isSelectionMode && (
            <TouchableOpacity
              onPress={handleBulkDelete}
              style={[styles.actionButton, { backgroundColor: dangerColor }]}
            >
              <Text style={styles.actionButtonText}>
                Delete ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={toggleSelectionMode}
            style={[styles.actionButton, { backgroundColor: isSelectionMode ? primaryColor : cardColor }]}
          >
            <Text style={[styles.actionButtonText, { color: isSelectionMode ? '#FFFFFF' : textColor }]}>
              {isSelectionMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
            No recordings yet{'\n'}Start recording to see your history
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
          }
        />
      )}

      {/* Session Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Session Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalClose, { color: primaryColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {selectedSession && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: cardColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Date & Time</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {new Date(selectedSession.timestamp).toLocaleString()}
                </Text>
              </View>

              <View style={[styles.detailCard, { backgroundColor: cardColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Duration</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {selectedSession.duration} seconds
                </Text>
              </View>

              <View style={[styles.detailCard, { backgroundColor: cardColor }]}>
                <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Statistics</Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStatItem}>
                    <Text style={[styles.detailStatLabel, { color: secondaryTextColor }]}>Mean Amplitude</Text>
                    <Text style={[styles.detailStatValue, { color: textColor }]}>
                      {selectedSession.stats.meanAmplitude.toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={[styles.detailStatLabel, { color: secondaryTextColor }]}>Variability</Text>
                    <Text style={[styles.detailStatValue, { color: textColor }]}>
                      {selectedSession.stats.variability.toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={[styles.detailStatLabel, { color: secondaryTextColor }]}>Peak Amplitude</Text>
                    <Text style={[styles.detailStatValue, { color: textColor }]}>
                      {selectedSession.stats.peakAmplitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedSession.context && (
                <View style={[styles.detailCard, { backgroundColor: cardColor }]}>
                  <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Context</Text>
                  {selectedSession.context.caffeine && (
                    <Text style={[styles.detailValue, { color: textColor }]}>• Caffeine consumed</Text>
                  )}
                  {selectedSession.context.sleepDeprived && (
                    <Text style={[styles.detailValue, { color: textColor }]}>• Sleep deprived</Text>
                  )}
                  {selectedSession.context.stress && (
                    <Text style={[styles.detailValue, { color: textColor }]}>• Feeling stressed</Text>
                  )}
                  {selectedSession.context.notes && (
                    <Text style={[styles.detailValue, { color: textColor, marginTop: 8 }]}>
                      Notes: {selectedSession.context.notes}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  sessionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sessionDuration: {
    fontSize: 15,
    fontWeight: '400',
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3E3E42',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.7,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  contextTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '400',
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
  detailCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 17,
  },
  detailStats: {
    marginTop: 8,
  },
  detailStatItem: {
    marginBottom: 12,
  },
  detailStatLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
});
