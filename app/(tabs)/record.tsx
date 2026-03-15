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

const PURPLE = "#6B4EAA";
const WHITE = "#FFFFFF";

const SHAKING_VARIABILITY_THRESHOLD = 0.03;

const CIRCLE_SIZE = 240;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const DOT_SIZE = 24;
const MAX_OFFSET = CIRCLE_RADIUS - DOT_SIZE / 2;
const ACCEL_SCALE = 140;

function clampOffset(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len <= MAX_OFFSET) return { dx, dy };
  const s = MAX_OFFSET / len;
  return { dx: dx * s, dy: dy * s };
}

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

  const bg = isDark ? "#1a1520" : "#F5F2FA";
  const cardBg = isDark ? "#2a2433" : WHITE;
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const secondaryColor = isDark ? "#B8B0C4" : "#6D6D72";

  const isShaking =
    lastResult != null &&
    lastResult.stats.variability >= SHAKING_VARIABILITY_THRESHOLD;

  const dotPosition = useMemo(() => {
    if (!accelerometerData || !isRecording || countdown !== null) {
      return { dx: 0, dy: 0 };
    }
    const dx = accelerometerData.x * ACCEL_SCALE;
    const dy = -accelerometerData.y * ACCEL_SCALE; // flip Y so tilt matches visually
    return clampOffset(dx, dy);
  }, [accelerometerData, isRecording, countdown]);

  if (!settings) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: bg }]}
        edges={["top"]}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={[styles.loadingText, { color: secondaryColor }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bg }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: PURPLE }]}>TremorSense</Text>
            <Text style={[styles.subtitle, { color: secondaryColor }]}>
              Hold your phone steady. We’ll use the gyroscope and accelerometer
              to detect shaking from conditions like Parkinson’s, MS, or
              hyperthyroidism.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              Check your hands
            </Text>
            <Text style={[styles.cardDesc, { color: secondaryColor }]}>
              Tap the button below to start the check. Keep the device still in
              your hand during the test.
            </Text>

            {!isAvailable && (
              <Text style={[styles.warningText, { color: "#C62828" }]}>
                Sensors are not available on this device.
              </Text>
            )}

            {error != null && (
              <Text style={[styles.warningText, { color: "#C62828" }]}>
                {error}
              </Text>
            )}

            {countdown != null && (
              <View style={styles.countdownWrap}>
                <Text style={[styles.countdownText, { color: PURPLE }]}>
                  {countdown}
                </Text>
                <Text style={[styles.countdownHint, { color: secondaryColor }]}>
                  Get ready…
                </Text>
              </View>
            )}

            {isRecording && countdown === null && (
              <>
                <Text
                  style={[styles.visualizerLabel, { color: secondaryColor }]}
                >
                  Hold the phone in your hand. The dot moves with your motion.
                </Text>
                <View style={styles.visualizerWrap}>
                  <View style={styles.circle}>
                    <View
                      style={[
                        styles.dot,
                        {
                          left: CIRCLE_RADIUS - DOT_SIZE / 2 + dotPosition.dx,
                          top: CIRCLE_RADIUS - DOT_SIZE / 2 + dotPosition.dy,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.progressWrap}>
                  <View
                    style={[
                      styles.progressBg,
                      { backgroundColor: isDark ? "#3d3548" : "#E8E4F0" },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: PURPLE },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.progressLabel, { color: secondaryColor }]}
                  >
                    Measuring… {Math.round(progress)}%
                  </Text>
                </View>
              </>
            )}

            {!isRecording && countdown === null && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  !isAvailable && styles.buttonDisabled,
                ]}
                onPress={handleStartCheck}
                disabled={!isAvailable}
              >
                <Text style={styles.buttonText}>Start checking process</Text>
              </Pressable>
            )}
          </View>

          {lastResult != null && (() => {
            const tremorScore = getTremorScore(lastResult.stats);
            const scoreLabel = getTremorScoreLabel(tremorScore);
            return (
              <View style={[styles.resultCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.resultTitle, { color: textColor }]}>
                  Result
                </Text>
                <View style={styles.scoreRow}>
                  <Text style={[styles.scoreLabel, { color: secondaryColor }]}>
                    Hand tremor likelihood
                  </Text>
                  <Text style={[styles.scoreValue, { color: textColor }]}>
                    {tremorScore}/100
                  </Text>
                  <Text style={[styles.scoreSubLabel, { color: secondaryColor }]}>
                    {scoreLabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.resultBadge,
                    {
                      backgroundColor: isShaking
                        ? "rgba(198,40,40,0.15)"
                        : "rgba(76,175,80,0.15)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultBadgeText,
                      { color: isShaking ? "#C62828" : "#2E7D32" },
                    ]}
                  >
                    {isShaking ? "Shaking detected" : "Steady"}
                  </Text>
                </View>
                <Text style={[styles.resultStat, { color: secondaryColor }]}>
                  Variability: {lastResult.stats.variability.toFixed(4)}
                </Text>
                <Text style={[styles.resultStat, { color: secondaryColor }]}>
                  Mean amplitude: {lastResult.stats.meanAmplitude.toFixed(4)}
                </Text>
                <Text style={[styles.resultHint, { color: secondaryColor }]}>
                  Session saved. View history or graphs for trends.
                </Text>
              </View>
            );
          })()}
        </View>
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
    paddingVertical: 24,
    paddingBottom: 40,
  },
  inner: {
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  warningText: {
    fontSize: 14,
    marginTop: 12,
  },
  countdownWrap: {
    marginTop: 20,
    alignItems: "center",
  },
  countdownText: {
    fontSize: 48,
    fontWeight: "800",
  },
  countdownHint: {
    fontSize: 14,
    marginTop: 4,
  },
  visualizerLabel: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  visualizerWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    position: "relative",
  },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#1C1C1E",
  },
  progressWrap: {
    marginTop: 20,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
  },
  resultCard: {
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  scoreRow: {
    marginBottom: 14,
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  scoreSubLabel: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "600",
  },
  resultBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultBadgeText: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultStat: {
    fontSize: 14,
    marginBottom: 4,
  },
  resultHint: {
    fontSize: 13,
    marginTop: 8,
  },
});
