// Insights tab - AI-style analysis and trends

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RecordingSession, TrendAnalysis } from '@/types';
import { loadAllSessions } from '@/utils/storage';
import { generateTrendAnalysis } from '@/utils/analysis';
import { useFocusEffect } from '@react-navigation/native';

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const loaded = await loadAllSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      const trendAnalysis = generateTrendAnalysis(loaded);
      setAnalysis(trendAnalysis);
    } else {
      setAnalysis(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const backgroundColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#98989D' : '#6D6D70';
  const primaryColor = isDark ? '#4A9EFF' : '#007AFF';
  const successColor = '#34C759';
  const warningColor = '#FF9500';
  const dangerColor = '#FF3B30';

  const getStabilityColor = (score: number) => {
    if (score >= 80) return successColor;
    if (score >= 60) return warningColor;
    return dangerColor;
  };

  const getClassificationColor = (type: string) => {
    switch (type) {
      case 'stable':
        return successColor;
      case 'variable':
        return warningColor;
      case 'increasing':
        return dangerColor;
      default:
        return secondaryTextColor;
    }
  };

  if (!analysis) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>Insights</Text>
          </View>
          <View style={[styles.emptyCard, { backgroundColor: cardColor }]}>
            <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
              No data available yet{'\n'}Start recording to see insights
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Insights</Text>
          <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
            Analysis of your motion patterns
          </Text>
        </View>

      {/* Stability Score */}
      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Stability Score</Text>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text
              style={[
                styles.scoreText,
                { color: getStabilityColor(analysis.stabilityScore) },
              ]}
            >
              {analysis.stabilityScore}
            </Text>
            <Text style={[styles.scoreLabel, { color: secondaryTextColor }]}>/ 100</Text>
          </View>
          <View style={styles.scoreBarContainer}>
            <View
              style={[
                styles.scoreBar,
                {
                  width: `${analysis.stabilityScore}%`,
                  backgroundColor: getStabilityColor(analysis.stabilityScore),
                },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.scoreDescription, { color: secondaryTextColor }]}>
          Higher scores indicate more consistent motion patterns
        </Text>
      </View>

      {/* Classification */}
      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Pattern Classification</Text>
        <View
          style={[
            styles.classificationBadge,
            { backgroundColor: getClassificationColor(analysis.classification.type) + '20' },
          ]}
        >
          <Text
            style={[
              styles.classificationText,
              { color: getClassificationColor(analysis.classification.type) },
            ]}
          >
            {analysis.classification.type.charAt(0).toUpperCase() +
              analysis.classification.type.slice(1)}
          </Text>
        </View>
        <Text style={[styles.confidenceText, { color: secondaryTextColor }]}>
          Confidence: {Math.round(analysis.classification.confidence * 100)}%
        </Text>
      </View>

      {/* Summary */}
      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Summary</Text>
        <Text style={[styles.summaryText, { color: textColor }]}>{analysis.summary}</Text>
      </View>

      {/* Anomalies */}
      {analysis.anomalies.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Notable Observations</Text>
          {analysis.anomalies.map((anomaly, index) => (
            <View key={index} style={styles.anomalyItem}>
              <View style={[styles.anomalyDot, { backgroundColor: warningColor }]} />
              <Text style={[styles.anomalyText, { color: textColor }]}>{anomaly}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Correlations */}
      {analysis.correlations.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Context Correlations</Text>
          {analysis.correlations.map((correlation, index) => (
            <View key={index} style={styles.correlationItem}>
              <View style={styles.correlationHeader}>
                <Text style={[styles.correlationContext, { color: textColor }]}>
                  {correlation.context}
                </Text>
                <View
                  style={[
                    styles.correlationBadge,
                    {
                      backgroundColor:
                        correlation.impact === 'positive'
                          ? successColor + '20'
                          : correlation.impact === 'negative'
                          ? dangerColor + '20'
                          : secondaryTextColor + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.correlationImpact,
                      {
                        color:
                          correlation.impact === 'positive'
                            ? successColor
                            : correlation.impact === 'negative'
                            ? dangerColor
                            : secondaryTextColor,
                      },
                    ]}
                  >
                    {correlation.impact === 'positive'
                      ? '✓ Positive'
                      : correlation.impact === 'negative'
                      ? '✗ Negative'
                      : '○ Neutral'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.correlationDescription, { color: secondaryTextColor }]}>
                {correlation.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <View style={[styles.disclaimerCard, { backgroundColor: cardColor }]}>
        <Text style={[styles.disclaimerTitle, { color: textColor }]}>Important Note</Text>
        <Text style={[styles.disclaimerText, { color: secondaryTextColor }]}>
          This app measures and visualizes motion data only. It does not diagnose, treat, or
          predict any medical condition. All analysis is based on mathematical patterns and should
          not be used as medical advice.
        </Text>
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
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
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 28,
    marginLeft: 10,
    fontWeight: '600',
  },
  scoreBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#3E3E42',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 5,
  },
  scoreDescription: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 4,
  },
  classificationBadge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  classificationText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confidenceText: {
    fontSize: 14,
  },
  summaryText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  anomalyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 14,
  },
  anomalyText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  correlationItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#3E3E42',
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  correlationContext: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  correlationBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  correlationImpact: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  correlationDescription: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  disclaimerCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  disclaimerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#FF9500',
    letterSpacing: -0.3,
  },
  disclaimerText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '400',
  },
});
