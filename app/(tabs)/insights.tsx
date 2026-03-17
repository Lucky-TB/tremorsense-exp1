import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { loadAllSessions } from '@/utils/storage';
import { getTremorScore } from '@/utils/signalProcessing';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RecordingSession } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

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

function buildSystemPrompt(sessions: RecordingSession[]): string {
  const scores = sessions.map(s => getTremorScore(s.stats));
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const latest = scores.length > 0 ? scores[0] : null;

  let dataContext = '';
  if (sessions.length > 0) {
    dataContext = `
The user has ${sessions.length} tremor recordings.
- Latest tremor score: ${latest}/100 (${latest !== null ? getScoreStatus(latest) : 'N/A'})
- Average score: ${avg}/100
- Score range: ${Math.min(...scores)} to ${Math.max(...scores)}
- Tremor score scale: 0-25 = OPTIMAL (very steady), 26-50 = GOOD, 51-75 = FAIR, 76-100 = ATTENTION (high tremor)
- Lower scores mean steadier hands. Higher scores indicate more tremor activity.
`;
  } else {
    dataContext = 'The user has no tremor recordings yet.';
  }

  return `You are TremorSense Advisor, a helpful health assistant built into the TremorSense app — a mobile app that measures hand tremor using phone sensors (accelerometer/gyroscope).

${dataContext}

Your role:
- Help users understand their tremor readings and scores
- Explain what factors influence tremor (caffeine, sleep, stress, medications, etc.)
- Provide practical tips for getting accurate measurements
- Suggest when to consult a healthcare professional
- Answer questions about conditions associated with tremor (Parkinson's, essential tremor, MS, hyperthyroidism, etc.)

Important:
- You are NOT a medical diagnostic tool. Always remind users to consult a doctor for medical advice.
- Be concise, warm, and encouraging.
- Keep responses focused and under 150 words unless more detail is genuinely needed.
- Do not make up data or scores the user hasn't recorded.`;
}

// Oura-style embedded score card with bar chart
function ReadinessCard({ sessions, isDark }: { sessions: RecordingSession[]; isDark: boolean }) {
  if (sessions.length === 0) return null;

  const recentSessions = sessions.slice(0, 7);
  const scores = recentSessions.map(s => getTremorScore(s.stats));
  const latestScore = scores[0];
  const scoreColor = getScoreColor(latestScore);
  const status = getScoreStatus(latestScore);

  let trendText = '';
  let trendColor = '#8A8A8E';
  let trendIcon: 'trending-up' | 'trending-down' | 'remove' = 'remove';
  if (scores.length >= 4) {
    const recent = scores.slice(0, 3);
    const earlier = scores.slice(3, 6);
    if (earlier.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      if (recentAvg < earlierAvg - 3) { trendText = 'Trending down'; trendColor = '#5CC5AB'; trendIcon = 'trending-down'; }
      else if (recentAvg > earlierAvg + 3) { trendText = 'Trending up'; trendColor = '#E8A44C'; trendIcon = 'trending-up'; }
      else { trendText = 'Stable'; trendColor = '#8A8A8E'; trendIcon = 'remove'; }
    }
  }

  const dayLabels = recentSessions.map(s => {
    const d = new Date(s.timestamp);
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
  }).reverse();

  const barScores = [...scores].reverse();
  const cardBg = isDark ? '#1A2830' : '#E8ECF0';
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const secondaryColor = isDark ? '#8A8A8E' : '#6D6D72';

  return (
    <View style={[rcStyles.card, { backgroundColor: cardBg }]}>
      <View style={rcStyles.topRow}>
        <View style={[rcStyles.iconCircle, { backgroundColor: isDark ? '#253038' : '#D8DDE2' }]}>
          <Ionicons name="pulse" size={18} color={scoreColor} />
        </View>
        <View style={rcStyles.titleWrap}>
          <Text style={[rcStyles.title, { color: textColor }]}>Tremor Score</Text>
          <Text>
            <Text style={[rcStyles.statusLabel, { color: scoreColor }]}>{status} </Text>
            <Text style={[rcStyles.periodLabel, { color: secondaryColor }]}>LAST {recentSessions.length} CHECKS</Text>
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={secondaryColor} />
      </View>
      <View style={rcStyles.contentRow}>
        <View style={rcStyles.scoreSection}>
          <Text style={[rcStyles.scoreValue, { color: textColor }]}>{latestScore}</Text>
          {trendText ? (
            <View style={[rcStyles.trendPill, { backgroundColor: trendColor + '20' }]}>
              <Ionicons name={trendIcon} size={14} color={trendColor} />
              <Text style={[rcStyles.trendText, { color: trendColor }]}>{trendText}</Text>
            </View>
          ) : null}
        </View>
        <View style={rcStyles.chartSection}>
          <Text style={[rcStyles.chartMax, { color: secondaryColor }]}>100</Text>
          <View style={rcStyles.barsRow}>
            {barScores.map((s, i) => (
              <View key={i} style={rcStyles.barCol}>
                <View style={rcStyles.barTrack}>
                  <View style={[rcStyles.barFill, { height: `${Math.max(s, 4)}%`, backgroundColor: isDark ? '#E8E4DC' : '#1C1C1E' }]} />
                </View>
                <Text style={[rcStyles.barLabel, { color: secondaryColor }]}>{dayLabels[i] || ''}</Text>
              </View>
            ))}
          </View>
          <Text style={[rcStyles.chartMin, { color: secondaryColor }]}>0</Text>
        </View>
      </View>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  titleWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  statusLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  periodLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
  contentRow: { flexDirection: 'row', alignItems: 'flex-end' },
  scoreSection: { flex: 1 },
  scoreValue: { fontSize: 56, fontWeight: '200', letterSpacing: -2, lineHeight: 62 },
  trendPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginTop: 6, gap: 4 },
  trendText: { fontSize: 13, fontWeight: '600' },
  chartSection: { alignItems: 'flex-end', width: 160 },
  chartMax: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72 },
  barCol: { alignItems: 'center', width: 14 },
  barTrack: { width: 8, height: 72, justifyContent: 'flex-end' },
  barFill: { width: '100%', minHeight: 3, borderRadius: 2 },
  barLabel: { fontSize: 10, fontWeight: '500', marginTop: 4 },
  chartMin: { fontSize: 10, fontWeight: '500', marginTop: 2 },
});

function SuggestionChips({ onChipPress, isDark }: { onChipPress: (text: string) => void; isDark: boolean }) {
  const chips = ['What helps with tremor', 'What caused my score change', 'Tips for better readings'];
  const chipBg = isDark ? '#1A2830' : '#E8ECF0';
  const chipColor = isDark ? '#E8E4DC' : '#1C1C1E';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={chipStyles.scroll} contentContainerStyle={chipStyles.content}>
      {chips.map((chip) => (
        <Pressable key={chip} style={({ pressed }) => [chipStyles.chip, { backgroundColor: chipBg }, pressed && { opacity: 0.7 }]} onPress={() => onChipPress(chip)}>
          <Text style={[chipStyles.text, { color: chipColor }]}>{chip}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const chipStyles = StyleSheet.create({
  scroll: { marginTop: 12 },
  content: { gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  text: { fontSize: 14, fontWeight: '500' },
});

type Message = { id: string; role: 'user' | 'ai'; text: string };

const WELCOME_TEXT = "Hey! What's on your mind?";

export default function InsightsScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: `welcome-${Date.now()}`, role: 'ai', text: WELCOME_TEXT },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestSessions, setLatestSessions] = useState<RecordingSession[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const inputHeight = useRef(new Animated.Value(44)).current;
  const contentHeightRef = useRef(0);
  const chatRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0D0D0D' : '#F5F5F0';
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const secondaryColor = isDark ? '#8A8A8E' : '#6D6D72';
  const inputBg = isDark ? '#1A2428' : '#EDEDEA';
  const borderColor = isDark ? '#2A3438' : '#E5E5E0';
  const accent = isDark ? '#5CC5AB' : '#2D9B8A';

  useFocusEffect(
    useCallback(() => {
      loadAllSessions().then((loaded) => {
        const sorted = [...loaded].sort((a, b) => b.timestamp - a.timestamp);
        setLatestSessions(sorted.slice(0, 10));
      });
    }, [])
  );

  // Initialize Gemini chat session when sessions load
  useEffect(() => {
    if (!GEMINI_API_KEY) return;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    chatRef.current = model.startChat({
      systemInstruction: buildSystemPrompt(latestSessions),
      history: [],
    });
  }, [latestSessions]);

  useEffect(() => {
    const lineCount = (input.match(/\n/g) || []).length + 1;
    const targetHeight = Math.min(44 + lineCount * 22, 120);
    Animated.spring(inputHeight, { toValue: targetHeight, useNativeDriver: false, speed: 24, bounciness: 12 }).start();
  }, [input, inputHeight]);

  const scrollToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', text: trimmed };
    setInput('');
    inputHeight.setValue(44);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    [0, 50, 150].forEach((ms) => setTimeout(scrollToEnd, ms));

    try {
      let responseText = '';

      if (chatRef.current && GEMINI_API_KEY) {
        const result = await chatRef.current.sendMessage(trimmed);
        responseText = result.response.text();
      } else {
        responseText = 'Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.';
      }

      const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'ai', text: responseText };
      setMessages((prev) => [...prev, aiMsg]);
      [0, 50, 150, 300].forEach((ms) => setTimeout(scrollToEnd, ms));
    } catch (err) {
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        role: 'ai',
        text: 'Sorry, I had trouble connecting. Please check your internet connection and try again.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setInput('');
    inputHeight.setValue(44);
    setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: WELCOME_TEXT }]);
    // Reinit chat
    if (GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      chatRef.current = model.startChat({
        systemInstruction: buildSystemPrompt(latestSessions),
        history: [],
      });
    }
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    const prev = contentHeightRef.current;
    contentHeightRef.current = h;
    if (h > prev) {
      requestAnimationFrame(scrollToEnd);
      setTimeout(scrollToEnd, 50);
    }
  };

  const isLastAiMessage = (msgId: string) => {
    const aiMsgs = messages.filter((m) => m.role === 'ai');
    return aiMsgs.length > 0 && aiMsgs[aiMsgs.length - 1].id === msgId;
  };

  function renderAiContent(text: string) {
    const lines = text.split('\n');
    const parts: React.ReactNode[] = [];
    let key = 0;
    for (const line of lines) {
      const isBullet = /^[•\-]\s*/.test(line) || /^\d+\.\s*/.test(line);
      const trimmed = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
      if (isBullet && trimmed) {
        parts.push(
          <View key={key++} style={styles.bulletRow}>
            <Text style={[styles.bulletDot, { color: textColor }]}>{'\u2022'}</Text>
            <Text style={[styles.bulletText, { color: textColor }]}>{trimmed}</Text>
          </View>
        );
      } else if (line.trim()) {
        parts.push(<Text key={key++} style={[styles.aiLine, { color: textColor }]}>{line}</Text>);
      } else {
        parts.push(<View key={key++} style={styles.paragraphGap} />);
      }
    }
    return <View style={styles.aiBlock}>{parts}</View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <Pressable style={styles.headerIcon} hitSlop={12}>
          <Ionicons name="close" size={24} color={textColor} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Advisor</Text>
        <Pressable style={styles.headerIcon} hitSlop={12} onPress={handleNewChat}>
          <Ionicons name="options-outline" size={22} color={textColor} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: 16 }]}
          onContentSizeChange={handleContentSizeChange}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageWrap}>
              {msg.role === 'user' ? (
                <View style={[styles.userBubble, { backgroundColor: isDark ? '#2A3438' : '#EDEDEA' }]}>
                  <Text style={[styles.userBubbleText, { color: textColor }]}>{msg.text}</Text>
                </View>
              ) : (
                <View style={styles.aiWrap}>
                  {/* Sparkle + Advisor label */}
                  <View style={styles.advisorLabelRow}>
                    <Text style={styles.sparkle}>{'\u2728'}</Text>
                    <Text style={[styles.advisorLabel, { color: textColor }]}>Advisor</Text>
                  </View>

                  {renderAiContent(msg.text)}

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionBtn}>
                      <Ionicons name="copy-outline" size={16} color={secondaryColor} />
                    </Pressable>
                    <Pressable style={styles.actionBtn}>
                      <Ionicons name="thumbs-up-outline" size={16} color={secondaryColor} />
                    </Pressable>
                    <Pressable style={styles.actionBtn}>
                      <Ionicons name="thumbs-down-outline" size={16} color={secondaryColor} />
                    </Pressable>
                  </View>

                  {/* Embedded data card on last AI message */}
                  {isLastAiMessage(msg.id) && latestSessions.length > 0 && (
                    <ReadinessCard sessions={latestSessions} isDark={isDark} />
                  )}

                  {/* Suggestion chips on last AI message */}
                  {isLastAiMessage(msg.id) && !isLoading && (
                    <SuggestionChips onChipPress={(t) => handleSend(t)} isDark={isDark} />
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <View style={styles.messageWrap}>
              <View style={styles.aiWrap}>
                <View style={styles.advisorLabelRow}>
                  <Text style={styles.sparkle}>{'\u2728'}</Text>
                  <Text style={[styles.advisorLabel, { color: textColor }]}>Advisor</Text>
                </View>
                <View style={[styles.typingBubble, { backgroundColor: isDark ? '#1A2428' : '#EDEDEA' }]}>
                  <ActivityIndicator size="small" color={accent} />
                  <Text style={[styles.typingText, { color: secondaryColor }]}>Thinking...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBarWrap, { backgroundColor: bg, borderTopColor: borderColor }]}>
          <View style={[styles.inputBar, { backgroundColor: inputBg }]}>
            <Pressable style={styles.plusButton}>
              <Ionicons name="add" size={24} color={secondaryColor} />
            </Pressable>
            <Animated.View style={[styles.inputWrap, { height: inputHeight }]}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Write to Advisor"
                placeholderTextColor={isDark ? '#4A4A4E' : '#AEAEB2'}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                editable={!isLoading}
                blurOnSubmit={false}
              />
            </Animated.View>
            <Pressable
              style={[styles.sendIconBtn, { backgroundColor: (input.trim() && !isLoading) ? accent : borderColor }]}
              onPress={() => handleSend()}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons name="arrow-up" size={18} color={(input.trim() && !isLoading) ? '#0D0D0D' : secondaryColor} />
            </Pressable>
          </View>
          <Text style={[styles.disclaimer, { color: isDark ? '#4A4A4E' : '#AEAEB2' }]}>
            Advisor can make mistakes
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
  scrollView: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16 },
  messageWrap: { marginBottom: 24 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubbleText: { fontSize: 16, lineHeight: 22 },
  aiWrap: { alignSelf: 'flex-start', width: '100%' },
  advisorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sparkle: { fontSize: 14 },
  advisorLabel: { fontSize: 15, fontWeight: '700' },
  aiBlock: { flex: 1 },
  aiLine: { fontSize: 16, lineHeight: 24, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 8 },
  bulletDot: { fontSize: 16, lineHeight: 24, width: 16, textAlign: 'center' },
  bulletText: { flex: 1, fontSize: 16, lineHeight: 24 },
  paragraphGap: { height: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  typingText: { fontSize: 14 },
  inputBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderTopWidth: 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 48,
  },
  plusButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, justifyContent: 'center', marginHorizontal: 2, minHeight: 40 },
  input: { fontSize: 16, paddingVertical: 8, paddingHorizontal: 4, maxHeight: 100 },
  sendIconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },
});
