// AI-style analysis utilities (rule-based, transparent)

import { RecordingSession, TrendAnalysis, StabilityClassification } from '@/types';
import { calculateVariability, detectAnomalies } from './signalProcessing';

/**
 * Classify stability based on variability and trends
 */
export function classifyStability(
  currentVariability: number,
  baselineVariability: number,
  trend: 'stable' | 'increasing' | 'decreasing'
): StabilityClassification {
  const ratio = currentVariability / (baselineVariability || 1);
  
  if (ratio < 1.1 && trend === 'stable') {
    return { type: 'stable', confidence: 0.9 };
  } else if (ratio > 1.5 || trend === 'increasing') {
    return { type: 'increasing', confidence: 0.8 };
  } else if (ratio > 1.2) {
    return { type: 'variable', confidence: 0.7 };
  } else {
    return { type: 'irregular', confidence: 0.6 };
  }
}

/**
 * Calculate baseline variability from historical sessions
 */
export function calculateBaseline(sessions: RecordingSession[]): number {
  if (sessions.length === 0) return 0;
  
  const variabilities = sessions.map(s => s.stats.variability);
  const sorted = variabilities.sort((a, b) => a - b);
  const medianIndex = Math.floor(sorted.length / 2);
  
  // Use median to avoid outliers
  return sorted.length % 2 === 0
    ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
    : sorted[medianIndex];
}

/**
 * Detect trend in recent sessions
 */
export function detectTrend(sessions: RecordingSession[], days: number = 7): 'stable' | 'increasing' | 'decreasing' {
  if (sessions.length < 3) return 'stable';
  
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const recent = sessions
    .filter(s => s.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  if (recent.length < 3) return 'stable';
  
  const variabilities = recent.map(s => s.stats.variability);
  const firstHalf = variabilities.slice(0, Math.floor(variabilities.length / 2));
  const secondHalf = variabilities.slice(Math.floor(variabilities.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
  
  const change = (secondAvg - firstAvg) / firstAvg;
  
  if (change > 0.15) return 'increasing';
  if (change < -0.15) return 'decreasing';
  return 'stable';
}

/**
 * Generate trend analysis
 */
export function generateTrendAnalysis(sessions: RecordingSession[]): TrendAnalysis {
  if (sessions.length === 0) {
    return {
      stabilityScore: 50,
      classification: { type: 'stable', confidence: 0.5 },
      summary: 'No data available yet. Start recording to see insights.',
      anomalies: [],
      correlations: [],
    };
  }
  
  const baseline = calculateBaseline(sessions);
  const recentSessions = sessions
    .filter(s => s.timestamp >= Date.now() - 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  const latest = recentSessions[0];
  const trend = detectTrend(sessions);
  const classification = classifyStability(
    latest.stats.variability,
    baseline,
    trend
  );
  
  // Calculate stability score (0-100, higher is more stable)
  const variabilityRatio = latest.stats.variability / (baseline || 1);
  const stabilityScore = Math.max(0, Math.min(100, 100 - (variabilityRatio - 1) * 50));
  
  // Detect anomalies
  const anomalies: string[] = [];
  const anomalyIndices = detectAnomalies(latest.magnitude);
  if (anomalyIndices.length > latest.magnitude.length * 0.1) {
    anomalies.push('Unusual motion patterns detected in recent recording');
  }
  
  // Generate summary
  const summaries: string[] = [];
  if (trend === 'increasing') {
    summaries.push('Your motion variability has increased slightly over the past week.');
  } else if (trend === 'decreasing') {
    summaries.push('Your motion variability has decreased, showing improved stability.');
  } else {
    summaries.push('Your motion patterns have remained relatively stable.');
  }
  
  if (recentSessions.length > 0) {
    const avgVariability = recentSessions.reduce((sum, s) => sum + s.stats.variability, 0) / recentSessions.length;
    if (avgVariability > baseline * 1.2) {
      summaries.push('Recent recordings show higher variability compared to your baseline.');
    }
  }
  
  // Find correlations with context
  const correlations: TrendAnalysis['correlations'] = [];
  
  const caffeineSessions = sessions.filter(s => s.context?.caffeine);
  const noCaffeineSessions = sessions.filter(s => !s.context?.caffeine);
  
  if (caffeineSessions.length > 2 && noCaffeineSessions.length > 2) {
    const caffeineAvg = caffeineSessions.reduce((sum, s) => sum + s.stats.variability, 0) / caffeineSessions.length;
    const noCaffeineAvg = noCaffeineSessions.reduce((sum, s) => sum + s.stats.variability, 0) / noCaffeineSessions.length;
    const diff = (caffeineAvg - noCaffeineAvg) / noCaffeineAvg;
    
    if (Math.abs(diff) > 0.1) {
      correlations.push({
        context: 'Caffeine',
        impact: diff > 0 ? 'negative' : 'positive',
        description: `Sessions with caffeine show ${Math.abs(diff * 100).toFixed(0)}% ${diff > 0 ? 'higher' : 'lower'} variability.`,
      });
    }
  }
  
  const stressSessions = sessions.filter(s => s.context?.stress);
  const noStressSessions = sessions.filter(s => !s.context?.stress);
  
  if (stressSessions.length > 2 && noStressSessions.length > 2) {
    const stressAvg = stressSessions.reduce((sum, s) => sum + s.stats.variability, 0) / stressSessions.length;
    const noStressAvg = noStressSessions.reduce((sum, s) => sum + s.stats.variability, 0) / noStressSessions.length;
    const diff = (stressAvg - noStressAvg) / noStressAvg;
    
    if (Math.abs(diff) > 0.1) {
      correlations.push({
        context: 'Stress',
        impact: diff > 0 ? 'negative' : 'positive',
        description: `Sessions marked as stressful show ${Math.abs(diff * 100).toFixed(0)}% ${diff > 0 ? 'higher' : 'lower'} variability.`,
      });
    }
  }
  
  return {
    stabilityScore: Math.round(stabilityScore),
    classification,
    summary: summaries.join(' '),
    anomalies,
    correlations,
  };
}

/**
 * Get sessions grouped by day
 */
export function groupSessionsByDay(sessions: RecordingSession[]): Map<string, RecordingSession[]> {
  const grouped = new Map<string, RecordingSession[]>();
  
  sessions.forEach(session => {
    const date = new Date(session.timestamp);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(session);
  });
  
  return grouped;
}

/**
 * Calculate rolling average
 */
export function calculateRollingAverage(
  sessions: RecordingSession[],
  windowDays: number = 7
): { date: string; average: number }[] {
  const grouped = groupSessionsByDay(sessions);
  const sortedDays = Array.from(grouped.keys()).sort();
  
  const rolling: { date: string; average: number }[] = [];
  
  for (let i = 0; i < sortedDays.length; i++) {
    const windowStart = i >= windowDays ? i - windowDays + 1 : 0;
    const windowDaysList = sortedDays.slice(windowStart, i + 1);
    
    const windowSessions = windowDaysList.flatMap(day => grouped.get(day) || []);
    if (windowSessions.length > 0) {
      const avg = windowSessions.reduce((sum, s) => sum + s.stats.variability, 0) / windowSessions.length;
      rolling.push({ date: sortedDays[i], average: avg });
    }
  }
  
  return rolling;
}
