import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRecording } from "@/hooks/useRecording";
import type { AppSettings, RecordingSession } from "@/types";
import { loadSettings } from "@/utils/storage";
import { getTremorScore, getTremorScoreLabel } from "@/utils/signalProcessing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

const ACCENT = "#5CC5AB";
const ACCENT_DARK = "#2D9B8A";

const SHAKING_VARIABILITY_THRESHOLD = 0.03;

const CIRCLE_SIZE = 200;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const DOT_SIZE = 20;
const MAX_OFFSET = CIRCLE_RADIUS - DOT_SIZE / 2;
const ACCEL_SCALE = 140;

function clampOffset(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len <= MAX_OFFSET) return { dx, dy };
  const s = MAX_OFFSET / len;
  return { dx: dx * s, dy: dy * s };
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

function ScoreArc({ score, size = 180, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (totalAngle * Math.min(score, 100)) / 100;
  const scoreColor = getScoreColor(score);

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Path
          d={describeArc(startAngle, endAngle)}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {score > 0 && (
          <Path
            d={describeArc(startAngle, scoreAngle)}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 56, fontWeight: '200', color: '#E8E4DC', letterSpacing: -2 }}>
          {score}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: scoreColor, marginTop: -2 }}>
          {getScoreStatus(score)}
        </Text>
      </View>
    </View>
  );
}

function VitalCard({
  icon,
  iconBg,
  title,
  value,
  unit,
  status,
  statusColor,
  progress,
  isDark,
}: {
  icon: string;
  iconBg: string;
  title: string;
  value: string;
  unit?: string;
  status: string;
  statusColor: string;
  progress: number;
  isDark: boolean;
}) {
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const secondaryColor = isDark ? '#8A8A8E' : '#6D6D72';
  const cardBg = isDark ? '#1A2428' : '#FFFFFF';

  return (
    <View style={[vitalStyles.card, { backgroundColor: cardBg }]}>
      <View style={vitalStyles.cardTop}>
        <View style={[vitalStyles.iconCircle, { backgroundColor: iconBg + '20' }]}>
          <Text style={{ fontSize: 16, color: iconBg }}>{icon}</Text>
        </View>
        <View style={vitalStyles.cardInfo}>
          <Text style={[vitalStyles.cardTitle, { color: secondaryColor }]}>{title}</Text>
          <Text style={[vitalStyles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
        <View style={vitalStyles.cardValueWrap}>
          <Text style={[vitalStyles.cardValue, { color: textColor }]}>{value}</Text>
          {unit && <Text style={[vitalStyles.cardUnit, { color: secondaryColor }]}>{unit}</Text>}
        </View>
      </View>
      <View style={[vitalStyles.progressTrack, { backgroundColor: isDark ? '#0D0D0D' : '#F0EDE8' }]}>
        <View
          style={[
            vitalStyles.progressFill,
            { width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor },
          ]}
        />
      </View>
    </View>
  );
}

const vitalStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: -1,
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default function RecordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lastResult, setLastResult] = useState<RecordingSession | null>(null);

  const onComplete = useCallback((session: RecordingSession | null) => {
    setLastResult(session ?? null);
  }, []);

  const {
    isRecording,
    countdown,
    progress,
    error,
    isAvailable,
    startRecording,
    accelerometerData,
  } = useRecording(
    settings?.samplingRate ?? "medium",
    settings?.recordingDuration ?? 10,
    undefined,
    onComplete,
  );

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const handleStartCheck = () => {
    setLastResult(null);
    startRecording();
  };

  const bg = isDark ? "#0D0D0D" : "#F5F5F0";
  const cardBg = isDark ? "#1A2428" : "#FFFFFF";
  const textColor = isDark ? "#E8E4DC" : "#1C1C1E";
  const secondaryColor = isDark ? "#8A8A8E" : "#6D6D72";
  const accent = isDark ? ACCENT : ACCENT_DARK;

  const isShaking =
    lastResult != null &&
    lastResult.stats.variability >= SHAKING_VARIABILITY_THRESHOLD;

  const dotPosition = useMemo(() => {
    if (!accelerometerData || !isRecording || countdown !== null) {
      return { dx: 0, dy: 0 };
    }
    const dx = accelerometerData.x * ACCEL_SCALE;
    const dy = -accelerometerData.y * ACCEL_SCALE;
    return clampOffset(dx, dy);
  }, [accelerometerData, isRecording, countdown]);

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const tremorScore = lastResult ? getTremorScore(lastResult.stats) : null;
  const scoreLabel = tremorScore !== null ? getTremorScoreLabel(tremorScore) : null;
  const scoreColor = tremorScore !== null ? getScoreColor(tremorScore) : accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Oura-style header with date */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerGreeting, { color: textColor }]}>Tremor Check</Text>
            <View style={styles.dateRow}>
              <Text style={[styles.dateText, { color: secondaryColor, borderBottomColor: secondaryColor }]}>
                {dateStr}
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Score Arc - Oura Readiness style */}
        <View style={[styles.heroCard, { backgroundColor: cardBg }]}>
          {countdown !== null ? (
            <View style={styles.countdownWrap}>
              <Text style={[styles.countdownNumber, { color: textColor }]}>{countdown}</Text>
              <Text style={[styles.countdownLabel, { color: secondaryColor }]}>Get ready...</Text>
            </View>
          ) : isRecording ? (
            <View style={styles.recordingWrap}>
              <View style={styles.visualizerWrap}>
                <View style={[styles.circle, { borderColor: isDark ? '#2A3438' : '#E5E5E0' }]}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: accent,
                        left: CIRCLE_RADIUS - DOT_SIZE / 2 + dotPosition.dx,
                        top: CIRCLE_RADIUS - DOT_SIZE / 2 + dotPosition.dy,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.progressSection}>
                <View style={[styles.progressBg, { backgroundColor: isDark ? '#0D0D0D' : '#E5E5E0' }]}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.progressLabel, { color: secondaryColor }]}>
                  Measuring... {Math.round(progress)}%
                </Text>
              </View>
            </View>
          ) : tremorScore !== null ? (
            <>
              <ScoreArc score={tremorScore} />
              <Text style={[styles.heroSubtitle, { color: secondaryColor }]}>
                Tremor Score
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retestButton,
                  { borderColor: isDark ? '#2A3438' : '#E5E5E0' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleStartCheck}
              >
                <Text style={[styles.retestText, { color: textColor }]}>Test Again</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.startWrap}>
              <View style={styles.emptyArcWrap}>
                <Svg width={180} height={180}>
                  <Circle
                    cx={90}
                    cy={90}
                    r={80}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={10}
                    fill="none"
                    strokeDasharray="4,8"
                  />
                </Svg>
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 40, color: isDark ? '#3A3A3E' : '#C0C0C0', fontWeight: '200' }}>--</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: secondaryColor, marginTop: 4 }}>
                    NO DATA
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroSubtitle, { color: secondaryColor }]}>
                Hold your phone steady to measure tremor
              </Text>

              {!isAvailable && (
                <Text style={[styles.warningText, { color: "#E85D5D" }]}>
                  Sensors not available on this device
                </Text>
              )}
              {error != null && (
                <Text style={[styles.warningText, { color: "#E85D5D" }]}>{error}</Text>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  { backgroundColor: accent },
                  pressed && { opacity: 0.85 },
                  !isAvailable && { opacity: 0.4 },
                ]}
                onPress={handleStartCheck}
                disabled={!isAvailable}
              >
                <Text style={styles.startButtonText}>Start Check</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Oura-style Vitals Cards - shown after result */}
        {lastResult != null && tremorScore !== null && (
          <View style={styles.vitalsSection}>
            <Text style={[styles.vitalsTitle, { color: textColor }]}>Vitals</Text>

            <VitalCard
              icon={'\u25CE'}
              iconBg={scoreColor}
              title="Tremor Score"
              value={String(tremorScore)}
              unit="/100"
              status={getScoreStatus(tremorScore)}
              statusColor={scoreColor}
              progress={tremorScore}
              isDark={isDark}
            />

            <VitalCard
              icon={'\u2261'}
              iconBg={isShaking ? '#E85D5D' : '#5CC5AB'}
              title="Stability"
              value={String(100 - tremorScore)}
              unit="%"
              status={isShaking ? 'SHAKING DETECTED' : 'STEADY'}
              statusColor={isShaking ? '#E85D5D' : '#5CC5AB'}
              progress={100 - tremorScore}
              isDark={isDark}
            />

            <VitalCard
              icon={'\u2191'}
              iconBg="#C4A46C"
              title="Variability"
              value={lastResult.stats.variability.toFixed(3)}
              status={lastResult.stats.variability < 0.03 ? 'NORMAL' : 'ELEVATED'}
              statusColor={lastResult.stats.variability < 0.03 ? '#5CC5AB' : '#E8A44C'}
              progress={Math.min(lastResult.stats.variability / 0.12 * 100, 100)}
              isDark={isDark}
            />

            <VitalCard
              icon={'\u25B2'}
              iconBg="#E8A44C"
              title="Peak Amplitude"
              value={lastResult.stats.peakAmplitude.toFixed(3)}
              status={lastResult.stats.peakAmplitude < 0.05 ? 'LOW' : lastResult.stats.peakAmplitude < 0.15 ? 'MODERATE' : 'HIGH'}
              statusColor={lastResult.stats.peakAmplitude < 0.05 ? '#5CC5AB' : lastResult.stats.peakAmplitude < 0.15 ? '#C4A46C' : '#E85D5D'}
              progress={Math.min(lastResult.stats.peakAmplitude / 0.3 * 100, 100)}
              isDark={isDark}
            />

            <View style={[styles.hintCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.hintText, { color: secondaryColor }]}>
                Session saved. View History or Graphs for trends over time.
              </Text>
            </View>
          </View>
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
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    borderBottomWidth: 1,
    paddingBottom: 1,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minHeight: 280,
    justifyContent: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  countdownWrap: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: -2,
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  recordingWrap: {
    alignItems: 'center',
    width: '100%',
  },
  visualizerWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: "rgba(26,36,40,0.5)",
    borderWidth: 1.5,
    position: "relative",
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  progressSection: {
    width: '100%',
    paddingHorizontal: 16,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  retestButton: {
    marginTop: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  retestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  startWrap: {
    alignItems: 'center',
    width: '100%',
  },
  emptyArcWrap: {
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  startButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
    marginTop: 20,
  },
  startButtonText: {
    color: "#0D0D0D",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  vitalsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  vitalsTitle: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: -0.3,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hintCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
