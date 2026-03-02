// Graphs tab - Modal with multiple charts, abbreviated labels, purple/white

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from '@/components/LineChart';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PURPLE = '#6B4EAA';
const PURPLE_LIGHT = '#9B7BC9';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 72, 320);

// Abbreviated days so labels don't cramp or overflow
const DAYS_SHORT = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

// Fake data for multiple graphs
const FAKE_SEVERITY = [2.1, 3.4, 2.8, 4.2, 3.0, 3.8, 2.5];
const FAKE_CONSISTENCY = [78, 72, 85, 69, 81, 76, 88];
const FAKE_DAILY_AVG = [2.8, 3.2, 2.9, 3.5, 3.1, 3.0, 2.7];

export default function GraphsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const BG = isDark ? '#1a1520' : '#F5F2FA';
  const CARD = isDark ? '#2a2433' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const secondaryColor = isDark ? '#B8B0C4' : '#6D6D72';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: PURPLE }]}>Tremor severity</Text>
          <Text style={[styles.subtitle, { color: secondaryColor }]}>
            How strong the tremor was each time you ran a check (demo data).
          </Text>
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
              Severity, consistency & daily trends in one place
            </Text>
            <View style={styles.openModalBadge}>
              <Text style={styles.openModalBadgeText}>3 charts</Text>
            </View>
          </View>
          <Text style={[styles.openModalArrow, { color: PURPLE }]}>›</Text>
        </Pressable>

        <View style={[styles.legendCard, { backgroundColor: CARD }]}>
          <Text style={[styles.legendTitle, { color: textColor }]}>About these charts</Text>
          <Text style={[styles.legendText, { color: secondaryColor }]}>
            When you run real checks, each result will appear here. Use them to spot trends and
            share with your care team if needed.
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
            <View style={[styles.chartCard, { backgroundColor: CARD }]}>
              <LineChart
                data={FAKE_SEVERITY}
                labels={DAYS_SHORT}
                title="Severity over time"
                color={PURPLE}
                height={200}
                width={CHART_WIDTH}
              />
              <Text style={[styles.chartHint, { color: secondaryColor }]}>
                Lower = calmer; higher = more shaking
              </Text>
            </View>

            <View style={[styles.chartCard, { backgroundColor: CARD }]}>
              <LineChart
                data={FAKE_CONSISTENCY}
                labels={DAYS_SHORT}
                title="Consistency score (%)"
                color={PURPLE_LIGHT}
                height={200}
                width={CHART_WIDTH}
              />
              <Text style={[styles.chartHint, { color: secondaryColor }]}>
                Higher = more stable readings
              </Text>
            </View>

            <View style={[styles.chartCard, { backgroundColor: CARD }]}>
              <LineChart
                data={FAKE_DAILY_AVG}
                labels={DAYS_SHORT}
                title="Daily average"
                color={PURPLE}
                height={200}
                width={CHART_WIDTH}
              />
              <Text style={[styles.chartHint, { color: secondaryColor }]}>
                Average severity per day
              </Text>
            </View>
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
