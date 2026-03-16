
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from '@/components/LineChart';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAllSessions } from '@/utils/storage';
import { getTremorScore } from '@/utils/signalProcessing';
import type { RecordingSession } from '@/types';

const PURPLE = '#6B4EAA';
const PURPLE_LIGHT = '#9B7BC9';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 72, 320);

const MAX_POINTS = 14;

function formatLabel(session: RecordingSession, index: number, total: number): string {
  const date = new Date(session.timestamp);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

export default function GraphsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const BG = isDark ? '#1a1520' : '#F5F2FA';
  const CARD = isDark ? '#2a2433' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const secondaryColor = isDark ? '#B8B0C4' : '#6D6D72';

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadAllSessions()
        .then((loaded) => {
          if (!cancelled) {
            const sorted = [...loaded].sort((a, b) => a.timestamp - b.timestamp);
            setSessions(sorted);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const chartSessions = sessions.slice(-MAX_POINTS);
  const labels = chartSessions.map((s, i) => formatLabel(s, i, chartSessions.length));
  const tremorData = chartSessions.map((s) => getTremorScore(s.stats));
  const stabilityData = tremorData.map((t) => Math.round(100 - t));
  const avgTremor =
    tremorData.length > 0
      ? Math.round(tremorData.reduce((a, b) => a + b, 0) / tremorData.length)
      : 0;
  const lastScore = tremorData.length > 0 ? tremorData[tremorData.length - 1] : null;

  const hasData = chartSessions.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: PURPLE }]}>Your tremor over time</Text>
          <Text style={[styles.subtitle, { color: secondaryColor }]}>
            {hasData
              ? 'Scores from each check (0 = steadier, 100 = more shaking). Run a check on Record to add data.'
              : 'Run "Start checking process" on the Record tab to add your first check. Your tremor score (0–100) will appear here.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={[styles.loadingText, { color: secondaryColor }]}>Loading…</Text>
          </View>
        ) : hasData ? (
          <>
            <View style={[styles.summaryCard, { backgroundColor: CARD }]}>
              <Text style={[styles.summaryTitle, { color: textColor }]}>Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: PURPLE }]}>
                    {lastScore != null ? `${lastScore}/100` : '—'}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: secondaryColor }]}>
                    Latest score
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: textColor }]}>
                    {avgTremor}/100
                  </Text>
                  <Text style={[styles.summaryLabel, { color: secondaryColor }]}>
                    Average
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: textColor }]}>
                    {chartSessions.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: secondaryColor }]}>
                    Checks shown
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.openModalCard,
                { backgroundColor: CARD },
                pressed && styles.openModalCardPressed,
              ]}
              onPress={() => setModalVisible(true)}
            >
              <View style={styles.openModalContent}>
                <Text style={[styles.openModalTitle, { color: textColor }]}>
                  View all graphs
                </Text>
                <Text style={[styles.openModalDesc, { color: secondaryColor }]}>
                  Tremor score, stability & trend
                </Text>
                <View style={styles.openModalBadge}>
                  <Text style={styles.openModalBadgeText}>3 charts</Text>
                </View>
              </View>
              <Text style={[styles.openModalArrow, { color: PURPLE }]}>›</Text>
            </Pressable>
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: CARD }]}>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No data yet</Text>
            <Text style={[styles.emptyText, { color: secondaryColor }]}>
              Go to Record and tap "Start checking process" to record your first check. Your tremor score (0–100) will show here and in History.
            </Text>
          </View>
        )}

        <View style={[styles.legendCard, { backgroundColor: CARD }]}>
          <Text style={[styles.legendTitle, { color: textColor }]}>How to read the score</Text>
          <Text style={[styles.legendText, { color: secondaryColor }]}>
            • 0–25: Low (hand was steady){'\n'}
            • 26–50: Moderate{'\n'}
            • 51–75: Elevated{'\n'}
            • 76–100: High (more shaking detected)
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: BG }]} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: PURPLE }]}>All graphs</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCloseText, { color: PURPLE }]}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!hasData ? (
              <Text style={[styles.noChartsText, { color: secondaryColor }]}>
                Run a check on Record to see your graphs.
              </Text>
            ) : (
              <>
                <View style={[styles.chartCard, { backgroundColor: CARD }]}>
                  <LineChart
                    data={tremorData}
                    labels={labels}
                    title="Tremor score (0–100)"
                    yAxisSuffix=""
                    color={PURPLE}
                    height={200}
                    width={CHART_WIDTH}
                  />
                  <Text style={[styles.chartHint, { color: secondaryColor }]}>
                    Your tremor likelihood for each check. Lower = steadier, higher = more shaking.
                  </Text>
                </View>

                <View style={[styles.chartCard, { backgroundColor: CARD }]}>
                  <LineChart
                    data={stabilityData}
                    labels={labels}
                    title="Stability (0–100)"
                    yAxisSuffix=""
                    color={PURPLE_LIGHT}
                    height={200}
                    width={CHART_WIDTH}
                  />
                  <Text style={[styles.chartHint, { color: secondaryColor }]}>
                    Same data as stability: higher = steadier hand.
                  </Text>
                </View>

                <View style={[styles.chartCard, { backgroundColor: CARD }]}>
                  <LineChart
                    data={chartSessions.map((s) =>
                      Math.min(100, Math.round((s.stats.variability / 0.12) * 100))
                    )}
                    labels={labels}
                    title="Shake intensity (0–100)"
                    yAxisSuffix=""
                    color={PURPLE}
                    height={200}
                    width={CHART_WIDTH}
                  />
                  <Text style={[styles.chartHint, { color: secondaryColor }]}>
                    Same scale as tremor score. Lower = steadier.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  openModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  openModalCardPressed: {
    opacity: 0.9,
  },
  openModalContent: {
    flex: 1,
  },
  openModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  openModalDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  openModalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  openModalBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  openModalArrow: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 12,
  },
  legendCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107,78,170,0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  modalCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseText: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  noChartsText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHint: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});
