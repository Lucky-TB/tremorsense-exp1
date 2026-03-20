import { useColorScheme } from "@/hooks/use-color-scheme";
import { RecordingSession } from "@/types";
import { getTremorScore, getTremorScoreLabel, analyzeFrequency } from "@/utils/signalProcessing";
import {
  deleteSession,
  deleteSessions,
  loadAllSessions,
} from "@/utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';

function getScoreColor(score: number): string {
  if (score <= 25) return '#5CC5AB';
  if (score <= 50) return '#C4A46C';
  if (score <= 75) return '#E8A44C';
  return '#E85D5D';
}

function getScoreStatus(score: number): string {
  if (score <= 25) return 'OPTIMAL';
  if (score <= 50) return 'GOOD';
  if (score <= 75) return 'FAIR';
  return 'ATTENTION';
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={miniStyles.track}>
      <View style={[miniStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const miniStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 1.5,
  },
});

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
    }, []),
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
    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession(sessionId);
          await loadSessions();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert("Delete Sessions", `Delete ${selectedIds.size} session(s)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSessions(Array.from(selectedIds));
          setSelectedIds(new Set());
          setIsSelectionMode(false);
          await loadSessions();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const bg = isDark ? "#0D0D0D" : "#F5F5F0";
  const cardBg = isDark ? "#1A2428" : "#FFFFFF";
  const textColor = isDark ? "#E8E4DC" : "#1C1C1E";
  const secondaryColor = isDark ? "#8A8A8E" : "#6D6D72";
  const accent = isDark ? "#5CC5AB" : "#2D9B8A";
  const borderColor = isDark ? "#2A3438" : "#E5E5E0";
  const dangerColor = "#E85D5D";

  const renderSession = ({ item }: { item: RecordingSession }) => {
    const date = new Date(item.timestamp);
    const isSelected = selectedIds.has(item.id);
    const tremorScore = getTremorScore(item.stats);
    const scoreColor = getScoreColor(tremorScore);
    const status = getScoreStatus(tremorScore);

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // FFT analysis for this session
    const freqInfo = item.magnitude.length >= 16 ? analyzeFrequency(item.magnitude) : null;

    return (
      <Pressable
        style={[
          styles.sessionCard,
          {
            backgroundColor: isSelected ? (isDark ? '#1E3A38' : '#E0F5F0') : cardBg,
            borderColor: isSelected ? accent : 'transparent',
            borderWidth: isSelected ? 1.5 : 0,
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
        {/* Top row: date + delete */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardDate, { color: secondaryColor }]}>{dayStr} {timeStr}</Text>
          {!isSelectionMode && (
            <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={isDark ? '#4A4A4E' : '#AEAEB2'} />
            </Pressable>
          )}
          {isSelectionMode && (
            <View style={[styles.checkCircle, { borderColor: isSelected ? accent : borderColor, backgroundColor: isSelected ? accent : 'transparent' }]}>
              {isSelected && <Ionicons name="checkmark" size={12} color="#0D0D0D" />}
            </View>
          )}
        </View>

        {/* Score hero row */}
        <View style={styles.cardScoreRow}>
          <View style={styles.cardScoreLeft}>
            <Text style={[styles.cardScoreValue, { color: textColor }]}>{tremorScore}</Text>
            <View style={styles.cardScoreMeta}>
              <Text style={[styles.cardScoreLabel, { color: scoreColor }]}>{status}</Text>
              <Text style={[styles.cardScoreSub, { color: secondaryColor }]}>Tremor Score</Text>
            </View>
          </View>
          <View style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
        </View>

        {/* Mini progress bar */}
        <MiniBar value={tremorScore} max={100} color={scoreColor} />

        {/* FFT frequency classification tag */}
        {freqInfo && freqInfo.dominantFrequency > 0 && freqInfo.tremorType !== 'none' && (
          <View style={freqTagStyles.row}>
            <View style={[freqTagStyles.badge, { backgroundColor: '#7B61FF18' }]}>
              <Text style={freqTagStyles.badgeLabel}>FFT</Text>
            </View>
            <Text style={[freqTagStyles.freqText, { color: '#7B61FF' }]}>
              {freqInfo.dominantFrequency} Hz
            </Text>
            <Text style={[freqTagStyles.typeText, { color: secondaryColor }]}>
              {freqInfo.tremorTypeLabel}
            </Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.cardStatsRow}>
          <View style={styles.cardStatItem}>
            <Text style={[styles.cardStatValue, { color: textColor }]}>{item.stats.meanAmplitude.toFixed(3)}</Text>
            <Text style={[styles.cardStatLabel, { color: secondaryColor }]}>Amplitude</Text>
          </View>
          <View style={[styles.cardStatDivider, { backgroundColor: borderColor }]} />
          <View style={styles.cardStatItem}>
            <Text style={[styles.cardStatValue, { color: textColor }]}>{item.stats.variability.toFixed(3)}</Text>
            <Text style={[styles.cardStatLabel, { color: secondaryColor }]}>Variability</Text>
          </View>
          <View style={[styles.cardStatDivider, { backgroundColor: borderColor }]} />
          <View style={styles.cardStatItem}>
            <Text style={[styles.cardStatValue, { color: textColor }]}>{item.duration}s</Text>
            <Text style={[styles.cardStatLabel, { color: secondaryColor }]}>Duration</Text>
          </View>
        </View>

        {/* Context tags */}
        {item.context && (
          <View style={styles.contextTags}>
            {item.context.caffeine && (
              <View style={[styles.tag, { backgroundColor: accent + '18' }]}>
                <Text style={[styles.tagText, { color: accent }]}>Caffeine</Text>
              </View>
            )}
            {item.context.sleepDeprived && (
              <View style={[styles.tag, { backgroundColor: accent + '18' }]}>
                <Text style={[styles.tagText, { color: accent }]}>Sleep Deprived</Text>
              </View>
            )}
            {item.context.stress && (
              <View style={[styles.tag, { backgroundColor: accent + '18' }]}>
                <Text style={[styles.tagText, { color: accent }]}>Stress</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
      {/* Oura-style centered header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerSide}>
          {isSelectionMode && (
            <Pressable onPress={handleBulkDelete} hitSlop={8}>
              <Ionicons name="trash" size={20} color={dangerColor} />
            </Pressable>
          )}
        </View>
        <Text style={[styles.headerTitle, { color: textColor }]}>History</Text>
        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <Pressable onPress={toggleSelectionMode} hitSlop={8}>
            <Text style={[styles.headerAction, { color: isSelectionMode ? accent : secondaryColor }]}>
              {isSelectionMode ? 'Done' : 'Select'}
            </Text>
          </Pressable>
        </View>
      </View>

      {isSelectionMode && selectedIds.size > 0 && (
        <View style={[styles.selectionBanner, { backgroundColor: isDark ? '#1A2428' : '#FFFFFF' }]}>
          <Text style={[styles.selectionText, { color: textColor }]}>
            {selectedIds.size} selected
          </Text>
        </View>
      )}

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1A2428' : '#FFFFFF' }]}>
            <Ionicons name="time-outline" size={32} color={secondaryColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Sessions Yet</Text>
          <Text style={[styles.emptyText, { color: secondaryColor }]}>
            Start a tremor check on the Record tab to see your history here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
          }
        />
      )}

      {/* Detail Modal - Oura style */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: textColor }]}>Session Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedSession && (() => {
            const score = getTremorScore(selectedSession.stats);
            const color = getScoreColor(score);
            return (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Hero score */}
                <View style={[styles.modalHero, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalScoreValue, { color: textColor }]}>{score}</Text>
                  <Text style={[styles.modalScoreStatus, { color }]}>{getScoreStatus(score)}</Text>
                  <Text style={[styles.modalScoreSub, { color: secondaryColor }]}>
                    {new Date(selectedSession.timestamp).toLocaleString()}
                  </Text>
                  <View style={[styles.modalProgressTrack, { backgroundColor: isDark ? '#0D0D0D' : '#F0EDE8' }]}>
                    <View style={[styles.modalProgressFill, { width: `${score}%`, backgroundColor: color }]} />
                  </View>
                </View>

                {/* Detail cards */}
                <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
                  <DetailRow label="Duration" value={`${selectedSession.duration}s`} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                  <DetailRow label="Samples" value={String(selectedSession.magnitude.length)} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                  <DetailRow label="Mean Amplitude" value={selectedSession.stats.meanAmplitude.toFixed(4)} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                  <DetailRow label="Variability" value={selectedSession.stats.variability.toFixed(4)} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                  <DetailRow label="Peak Amplitude" value={selectedSession.stats.peakAmplitude.toFixed(4)} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} last />
                </View>

                {/* FFT Frequency Analysis section in modal */}
                {(() => {
                  const freqData = selectedSession.magnitude.length >= 16
                    ? analyzeFrequency(selectedSession.magnitude)
                    : null;
                  if (!freqData || freqData.dominantFrequency <= 0) return null;
                  return (
                    <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
                      <Text style={[styles.detailCardLabel, { color: secondaryColor }]}>FREQUENCY ANALYSIS (FFT)</Text>
                      <DetailRow label="Dominant Frequency" value={`${freqData.dominantFrequency} Hz`} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                      <DetailRow label="Classification" value={freqData.tremorTypeLabel} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                      <DetailRow label="Confidence" value={`${Math.round(freqData.confidence * 100)}%`} textColor={textColor} secondaryColor={secondaryColor} borderColor={borderColor} />
                      {freqData.bands.filter(b => b.percentage > 5).map((band, i, arr) => (
                        <DetailRow
                          key={band.label}
                          label={`${band.label} (${band.range})`}
                          value={`${Math.round(band.percentage)}%`}
                          textColor={textColor}
                          secondaryColor={secondaryColor}
                          borderColor={borderColor}
                          last={i === arr.length - 1}
                        />
                      ))}
                    </View>
                  );
                })()}

                {selectedSession.context && (
                  <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
                    <Text style={[styles.detailCardLabel, { color: secondaryColor }]}>CONTEXT</Text>
                    {selectedSession.context.caffeine && <Text style={[styles.detailContextItem, { color: textColor }]}>Caffeine consumed</Text>}
                    {selectedSession.context.sleepDeprived && <Text style={[styles.detailContextItem, { color: textColor }]}>Sleep deprived</Text>}
                    {selectedSession.context.stress && <Text style={[styles.detailContextItem, { color: textColor }]}>Feeling stressed</Text>}
                    {selectedSession.context.notes && <Text style={[styles.detailContextItem, { color: secondaryColor }]}>Notes: {selectedSession.context.notes}</Text>}
                  </View>
                )}
              </ScrollView>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, textColor, secondaryColor, borderColor, last }: {
  label: string; value: string; textColor: string; secondaryColor: string; borderColor: string; last?: boolean;
}) {
  return (
    <View style={[detailRowStyles.row, !last && { borderBottomWidth: 0.5, borderBottomColor: borderColor }]}>
      <Text style={[detailRowStyles.label, { color: secondaryColor }]}>{label}</Text>
      <Text style={[detailRowStyles.value, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerSide: {
    width: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionBanner: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardScoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardScoreValue: {
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: -1.5,
  },
  cardScoreMeta: {},
  cardScoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardScoreSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
  },
  cardStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  cardStatValue: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  cardStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  cardStatDivider: {
    width: 0.5,
    height: 28,
  },
  contextTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalScoreValue: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: -2,
  },
  modalScoreStatus: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  modalScoreSub: {
    fontSize: 13,
    marginTop: 8,
  },
  modalProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
    marginTop: 16,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailCard: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 4,
    marginBottom: 12,
  },
  detailCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  detailContextItem: {
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 8,
  },
});

const freqTagStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#7B61FF',
  },
  freqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
