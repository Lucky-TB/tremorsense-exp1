import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PURPLE = '#6B4EAA';
const WHITE = '#FFFFFF';

const NEW_CHAT_WELCOME = {
  id: 'welcome',
  role: 'ai' as const,
  text: "Hi! I'm your TremorSense assistant.\n\nTo get the most out of this, you can ask me:\n• How to improve your tremor readings\n• What your charts and severity scores mean\n• Tips for managing symptoms day to day\n• When to share data with your care team\n\nAsk anything in the box below.",
};

const INITIAL_MESSAGES: { id: string; role: 'user' | 'ai'; text: string }[] = [
  { ...NEW_CHAT_WELCOME, id: `welcome-${Date.now()}` },
];

function renderAiContent(text: string, textColor: string) {
  const lines = text.split('\n');
  const parts: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = /^[•\-]\s*/.test(line) || /^\d+\.\s*/.test(line);
    const trimmed = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
    if (isBullet && trimmed) {
      parts.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: textColor }]}>•</Text>
          <Text style={[styles.bulletText, { color: textColor }]}>{trimmed}</Text>
        </View>
      );
    } else if (line.trim()) {
      parts.push(
        <Text key={key++} style={[styles.aiLine, { color: textColor }]}>
          {line}
        </Text>
      );
    } else {
      parts.push(<View key={key++} style={styles.paragraphGap} />);
    }
  }
  return <View style={styles.aiBlock}>{parts}</View>;
}

export default function InsightsScreen() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const inputHeight = useRef(new Animated.Value(44)).current;
  const contentHeightRef = useRef(0);
  const scrollToEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#1a1520' : '#F5F2FA';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const secondaryColor = isDark ? '#B8B0C4' : '#6D6D72';
  const inputBg = isDark ? '#2a2433' : '#E8E4F0';
  const borderColor = isDark ? '#3d3548' : '#E5E5EA';

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollToEndTimerRef.current) clearTimeout(scrollToEndTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const lineCount = (input.match(/\n/g) || []).length + 1;
    const targetHeight = Math.min(44 + lineCount * 22, 120);
    Animated.spring(inputHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      speed: 24,
      bounciness: 12,
    }).start();
  }, [input, inputHeight]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: trimmed,
    };

    setInput('');
    inputHeight.setValue(44);

    setMessages((prev) => [...prev, newMessage]);

    const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });
    [0, 50, 150, 300].forEach((ms) => {
      const t = setTimeout(scrollToEnd, ms);
      if (ms === 300) scrollToEndTimerRef.current = t;
    });
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    const prev = contentHeightRef.current;
    contentHeightRef.current = h;
    if (h > prev) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const handleNewChat = () => {
    setInput('');
    Animated.timing(inputHeight, {
      toValue: 44,
      duration: 150,
      useNativeDriver: false,
    }).start();
    setMessages([{ ...NEW_CHAT_WELCOME, id: `welcome-${Date.now()}` }]);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={[styles.headerBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <Pressable style={styles.headerIcon} hitSlop={12}>
          <Ionicons name="menu" size={24} color={textColor} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>TremorSense</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerIcon} hitSlop={12} onPress={handleNewChat}>
            <Ionicons name="create-outline" size={22} color={textColor} />
          </Pressable>
          <Pressable style={styles.headerIcon} hitSlop={12}>
            <Ionicons name="ellipsis-horizontal" size={22} color={textColor} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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
                <View style={[styles.userBubble, { backgroundColor: PURPLE }]}>
                  <Text style={styles.userBubbleText}>{msg.text}</Text>
                </View>
              ) : (
                <View style={styles.aiWrap}>
                  {renderAiContent(msg.text, textColor)}
                  {msg.id === messages.filter((m) => m.role === 'ai').pop()?.id && (
                    <View style={styles.actionRow}>
                      <Pressable style={styles.actionBtn}>
                        <Ionicons name="chatbubble-outline" size={18} color={secondaryColor} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
                        <Ionicons name="volume-medium-outline" size={18} color={secondaryColor} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
                        <Ionicons name="thumbs-up-outline" size={18} color={secondaryColor} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
                        <Ionicons name="thumbs-down-outline" size={18} color={secondaryColor} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
                        <Ionicons name="share-outline" size={18} color={secondaryColor} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputBarWrap, { backgroundColor: bg, borderTopColor: borderColor }]}>
          <View style={[styles.inputBar, { backgroundColor: inputBg }]}>
            <View style={styles.inputBarIconCentered}>
              <Pressable style={styles.plusButton}>
                <Ionicons name="add" size={26} color={textColor} />
              </Pressable>
            </View>
            <Animated.View style={[styles.inputWrap, { height: inputHeight }]}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Ask anything"
                placeholderTextColor={secondaryColor}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                editable
                blurOnSubmit={false}
              />
            </Animated.View>
            <View style={styles.inputBarIconCentered}>
              <Pressable style={styles.micButton}>
                <Ionicons name="mic-outline" size={22} color={textColor} />
              </Pressable>
            </View>
            <View style={styles.sendButtonWrap}>
              <Pressable
                style={[styles.sendIconBtn, { backgroundColor: input.trim() ? PURPLE : borderColor }]}
                onPress={handleSend}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={20} color={WHITE} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  messageWrap: {
    marginBottom: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userBubbleText: {
    color: WHITE,
    fontSize: 16,
    lineHeight: 22,
  },
  aiWrap: {
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  aiBlock: {
    flex: 1,
  },
  aiLine: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 24,
    width: 16,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  paragraphGap: {
    height: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  inputBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  inputBarIconCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  plusButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 44,
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendButtonWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
