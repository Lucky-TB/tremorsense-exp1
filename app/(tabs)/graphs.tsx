import React, { useState, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import type { RecordingSession } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 72, 320);
const MODAL_CHART_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

type Timeframe = '7d' | '14d' | '30d' | 'all';
type ChartType = 'tremor' | 'peak' | 'consistency';

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '7d': '7 Days',
  '14d': '14 Days',
  '30d': '30 Days',
  'all': 'All',
};

function formatLabel(session: RecordingSession): string {
  const date = new Date(session.timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function filterByTimeframe(sessions: RecordingSession[], tf: Timeframe): RecordingSession[] {
  if (tf === 'all') return sessions;
  const days = tf === '7d' ? 7 : tf === '14d' ? 14 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => s.timestamp >= cutoff);
}

function getTrendLabel(data: number[]): { text: string; color: string; icon: string } {
  if (data.length < 2) return { text: '', color: '#8A8A8E', icon: '' };
  const recent = data.slice(-3);
  const earlier = data.slice(-6, -3);
  if (earlier.length === 0) return { text: '', color: '#8A8A8E', icon: '' };
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  if (recentAvg < earlierAvg - 3) return { text: 'Trending down', color: '#5CC5AB', icon: 'trending-down' };
  if (recentAvg > earlierAvg + 3) return { text: 'Trending up', color: '#E8A44C', icon: 'trending-up' };
  return { text: 'Stable', color: '#8A8A8E', icon: 'remove' };
}

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

function getConsistencyScore(s: RecordingSession): number {
  const mag = s.magnitude;
  if (mag.length < 2) return 0;
  // mean of consecutive absolute differences — measures sample-to-sample jitter
  let diffSum = 0;
  for (let i = 1; i < mag.length; i++) {
    diffSum += Math.abs(mag[i] - mag[i - 1]);
  }
  const meanDiff = diffSum / (mag.length - 1);
  // 0.04 m/s² per sample at 50Hz = very jerky (score 100)
  return Math.min(100, Math.max(0, Math.round((meanDiff / 0.04) * 100)));
}

const CHART_CONFIGS: Record<ChartType, {
  title: string;
  subtitle: string;
  color: string;
  hint: string;
  getData: (sessions: RecordingSession[]) => number[];
}> = {
  tremor: {
    title: 'Tremor Score',
    subtitle: 'Overall tremor intensity',
    color: '', // uses accent (set at render time)
    hint: 'Composite of variability and amplitude — lower is steadier',
    getData: (sessions) => sessions.map((s) => getTremorScore(s.stats)),
  },
  peak: {
    title: 'Peak Amplitude',
    subtitle: 'Strongest spike per session',
    color: '#E8A44C',
    hint: 'Largest single deviation — lower is steadier',
    getData: (sessions) => sessions.map((s) => Math.min(100, Math.round((s.stats.peakAmplitude / 0.3) * 100))),
  },
  consistency: {
    title: 'Consistency Score',
    subtitle: 'How erratic vs steady',
    color: '#C4A46C',
    hint: 'Mean sample-to-sample jump in the raw signal — lower means smoother movement, higher means sudden jerks',
    getData: (sessions) => sessions.map((s) => getConsistencyScore(s)),

  },
};

export default function GraphsScreen() {
  const [activeModal, setActiveModal] = useState<ChartType | null>(null);
  const [modalTimeframe, setModalTimeframe] = useState<Timeframe>('14d');
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const cardBg = isDark ? '#1A2428' : '#FFFFFF';
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const secondaryColor = isDark ? '#8A8A8E' : '#6D6D72';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';
  const borderColor = isDark ? '#2A3438' : '#E5E5E0';

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
      return () => { cancelled = true; };
    }, [])
  );

  // Main page data (last 14 sessions)
  const previewSessions = sessions.slice(-14);
  const previewLabels = previewSessions.map((s) => formatLabel(s));
  const tremorData = previewSessions.map((s) => getTremorScore(s.stats));
  const peakData = previewSessions.map((s) => Math.min(100, Math.round((s.stats.peakAmplitude / 0.3) * 100)));
  const consistencyData = previewSessions.map((s) => getConsistencyScore(s));
  const avgTremor = tremorData.length > 0 ? Math.round(tremorData.reduce((a, b) => a + b, 0) / tremorData.length) : 0;
  const lastScore = tremorData.length > 0 ? tremorData[tremorData.length - 1] : null;
  const trend = getTrendLabel(tremorData);
  const hasData = previewSessions.length > 0;

  // Modal data (filtered by timeframe)
  const modalSessions = useMemo(() => filterByTimeframe(sessions, modalTimeframe), [sessions, modalTimeframe]);
  const modalLabels = modalSessions.map((s) => formatLabel(s));

  const openChart = (type: ChartType) => {
    setModalTimeframe('14d');
    setActiveModal(type);
  };

  const getModalData = () => {
    if (!activeModal) return [];
    return CHART_CONFIGS[activeModal].getData(modalSessions);
  };

  const getChartColor = (type: ChartType) => {
    return CHART_CONFIGS[type].color || accent;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerSide} />
        <Text style={[styles.headerTitle, { color: textColor }]}>Graphs</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : hasData ? (
          <>
            {/* Hero metric card */}
            <View style={[styles.heroCard, { backgroundColor: cardBg }]}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={[styles.heroLabel, { color: secondaryColor }]}>Latest Score</Text>
                  <View style={styles.heroValueRow}>
                    <Text style={[styles.heroValue, { color: textColor }]}>
                      {lastScore != null ? lastScore : '—'}
                    </Text>
                    <Text style={[styles.heroUnit, { color: secondaryColor }]}>/100</Text>
                  </View>
                  {lastScore != null && (
                    <Text style={[styles.heroStatus, { color: getScoreColor(lastScore) }]}>
                      {getScoreStatus(lastScore)}
                    </Text>
                  )}
                </View>
                <View style={styles.heroRight}>
                  <Text style={[styles.heroLabel, { color: secondaryColor }]}>Average</Text>
                  <Text style={[styles.heroAvgValue, { color: textColor }]}>{avgTremor}</Text>
                  <Text style={[styles.heroChecks, { color: secondaryColor }]}>
                    {previewSessions.length} checks
                  </Text>
                </View>
              </View>

              {trend.text ? (
                <View style={[styles.trendPill, { backgroundColor: trend.color + '18' }]}>
                  <Ionicons name={trend.icon as any} size={14} color={trend.color} />
                  <Text style={[styles.trendText, { color: trend.color }]}>{trend.text}</Text>
                </View>
              ) : null}

              {lastScore != null && (
                <View style={styles.heroProgressWrap}>
                  <View style={[styles.heroProgressTrack, { backgroundColor: isDark ? '#0D0D0D' : '#F0EDE8' }]}>
                    <View style={[styles.heroProgressFill, { width: `${lastScore}%`, backgroundColor: getScoreColor(lastScore) }]} />
                  </View>
                  <View style={styles.heroProgressLabels}>
                    <Text style={[styles.heroProgressLabel, { color: secondaryColor }]}>0</Text>
                    <Text style={[styles.heroProgressLabel, { color: secondaryColor }]}>50</Text>
                    <Text style={[styles.heroProgressLabel, { color: secondaryColor }]}>100</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Tremor Score card */}
            <ChartCard
              title="Tremor Score"
              subtitle={`Last ${previewSessions.length} checks`}
              data={tremorData}
              labels={previewLabels}
              color={accent}
              onPress={() => openChart('tremor')}
              textColor={textColor}
              secondaryColor={secondaryColor}
              cardBg={cardBg}
              rangeLabels
            />

            {/* Peak Amplitude card */}
            <ChartCard
              title="Peak Amplitude"
              subtitle="Strongest spike per session"
              data={peakData}
              labels={previewLabels}
              color="#E8A44C"
              onPress={() => openChart('peak')}
              textColor={textColor}
              secondaryColor={secondaryColor}
              cardBg={cardBg}
            />

            {/* Consistency Score card */}
            <ChartCard
              title="Consistency Score"
              subtitle="How erratic vs steady"
              data={consistencyData}
              labels={previewLabels}
              color="#C4A46C"
              onPress={() => openChart('consistency')}
              textColor={textColor}
              secondaryColor={secondaryColor}
              cardBg={cardBg}
            />

            {/* Legend */}
            <View style={[styles.legendCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.legendTitle, { color: textColor }]}>Score Ranges</Text>
              <View style={styles.legendGrid}>
                {[
                  { color: '#5CC5AB', label: '0-25 Low' },
                  { color: '#C4A46C', label: '26-50 Moderate' },
                  { color: '#E8A44C', label: '51-75 Elevated' },
                  { color: '#E85D5D', label: '76-100 High' },
                ].map(({ color: c, label }) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: c }]} />
                    <Text style={[styles.legendText, { color: secondaryColor }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
              <Ionicons name="analytics-outline" size={32} color={secondaryColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Data Yet</Text>
            <Text style={[styles.emptyText, { color: secondaryColor }]}>
              Run a tremor check on the Record tab to start seeing your graphs.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Individual chart detail modal */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: bg }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setActiveModal(null)} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {activeModal ? CHART_CONFIGS[activeModal].title : ''}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Timeframe selector */}
          <View style={[styles.timeframeRow, { borderBottomColor: borderColor }]}>
            {(['7d', '14d', '30d', 'all'] as Timeframe[]).map((tf) => (
              <Pressable
                key={tf}
                style={[
                  styles.timeframePill,
                  {
                    backgroundColor: modalTimeframe === tf ? accent : 'transparent',
                    borderColor: modalTimeframe === tf ? accent : borderColor,
                  },
                ]}
                onPress={() => setModalTimeframe(tf)}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    { color: modalTimeframe === tf ? '#FFFFFF' : secondaryColor },
                  ]}
                >
                  {TIMEFRAME_LABELS[tf]}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {modalSessions.length === 0 ? (
              <Text style={[styles.noChartsText, { color: secondaryColor }]}>
                No sessions in this time range.
              </Text>
            ) : (
              <>
                {/* Stats summary */}
                <View style={[styles.modalStatsRow, { backgroundColor: cardBg }]}>
                  <View style={styles.modalStat}>
                    <Text style={[styles.modalStatValue, { color: textColor }]}>
                      {modalSessions.length}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: secondaryColor }]}>Sessions</Text>
                  </View>
                  <View style={[styles.modalStatDivider, { backgroundColor: borderColor }]} />
                  <View style={styles.modalStat}>
                    <Text style={[styles.modalStatValue, { color: textColor }]}>
                      {Math.round(getModalData().reduce((a, b) => a + b, 0) / getModalData().length)}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: secondaryColor }]}>Average</Text>
                  </View>
                  <View style={[styles.modalStatDivider, { backgroundColor: borderColor }]} />
                  <View style={styles.modalStat}>
                    <Text style={[styles.modalStatValue, { color: textColor }]}>
                      {Math.min(...getModalData())}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: secondaryColor }]}>Best</Text>
                  </View>
                  <View style={[styles.modalStatDivider, { backgroundColor: borderColor }]} />
                  <View style={styles.modalStat}>
                    <Text style={[styles.modalStatValue, { color: textColor }]}>
                      {Math.max(...getModalData())}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: secondaryColor }]}>Worst</Text>
                  </View>
                </View>

                {/* Large chart */}
                <View style={[styles.modalChartCard, { backgroundColor: cardBg }]}>
                  <LineChart
                    data={getModalData()}
                    labels={modalLabels}
                    title=""
                    yAxisSuffix=""
                    color={activeModal ? getChartColor(activeModal) : accent}
                    height={240}
                    width={MODAL_CHART_WIDTH}
                  />
                  <Text style={[styles.modalChartHint, { color: secondaryColor }]}>
                    {activeModal ? CHART_CONFIGS[activeModal].hint : ''}
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

function ChartCard({ title, subtitle, data, labels, color, onPress, textColor, secondaryColor, cardBg, rangeLabels }: {
  title: string; subtitle: string; data: number[]; labels: string[]; color: string;
  onPress: () => void; textColor: string; secondaryColor: string; cardBg: string; rangeLabels?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chartPreviewCard, { backgroundColor: cardBg }, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <View style={styles.chartCardHeader}>
        <View>
          <Text style={[styles.chartCardTitle, { color: textColor }]}>{title}</Text>
          <Text style={[styles.chartCardSub, { color: secondaryColor }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={secondaryColor} />
      </View>
      <View style={styles.chartWrap}>
        <LineChart data={data} labels={labels} title="" yAxisSuffix="" color={color} height={160} width={CHART_WIDTH} />
      </View>
      {rangeLabels && (
        <View style={styles.chartRangeLabels}>
          <Text style={[styles.rangeLabel, { color: '#5CC5AB' }]}>Low</Text>
          <Text style={[styles.rangeLabel, { color: '#C4A46C' }]}>Moderate</Text>
          <Text style={[styles.rangeLabel, { color: '#E85D5D' }]}>High</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
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
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },

  // Hero card
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroValue: { fontSize: 44, fontWeight: '200', letterSpacing: -2 },
  heroUnit: { fontSize: 16, fontWeight: '400', marginLeft: 2 },
  heroStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  heroRight: { alignItems: 'flex-end' },
  heroAvgValue: { fontSize: 28, fontWeight: '200', letterSpacing: -1 },
  heroChecks: { fontSize: 12, marginTop: 2 },
  trendPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  trendText: { fontSize: 13, fontWeight: '600' },
  heroProgressWrap: { marginTop: 16 },
  heroProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 2 },
  heroProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  heroProgressLabel: { fontSize: 10, fontWeight: '500' },

  // Chart preview cards
  chartPreviewCard: { borderRadius: 20, padding: 18, marginBottom: 12 },
  chartCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartCardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  chartCardSub: { fontSize: 12 },
  chartWrap: { alignItems: 'center' },
  chartRangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 },
  rangeLabel: { fontSize: 11, fontWeight: '600' },

  // Legend
  legendCard: { borderRadius: 16, padding: 18 },
  legendTitle: { fontSize: 14, fontWeight: '600', marginBottom: 14 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 40 },
  noChartsText: { fontSize: 15, textAlign: 'center', paddingVertical: 40 },

  // Timeframe selector
  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal stats
  modalStatsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalStat: {
    alignItems: 'center',
    flex: 1,
  },
  modalStatValue: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  modalStatDivider: {
    width: 0.5,
    height: 32,
  },

  // Modal chart
  modalChartCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  modalChartHint: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 18 },
});
