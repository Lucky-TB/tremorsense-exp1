import { SensorData, RecordingStats } from '@/types';

export function calculateMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function calculateMagnitudeArray(data: SensorData): number[] {
  const magnitudes: number[] = [];
  const length = Math.min(data.x.length, data.y.length, data.z.length);
  
  for (let i = 0; i < length; i++) {
    magnitudes.push(calculateMagnitude(data.x[i], data.y[i], data.z[i]));
  }
  
  return magnitudes;
}

export function calculateTremorAmplitude(magnitude: number[]): number {
  if (magnitude.length === 0) return 0;
  
  const mean = magnitude.reduce((sum, val) => sum + val, 0) / magnitude.length;
  const deviations = magnitude.map(val => Math.abs(val - mean));
  return deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
}

export function calculateVariability(magnitude: number[]): number {
  if (magnitude.length === 0) return 0;
  
  const mean = magnitude.reduce((sum, val) => sum + val, 0) / magnitude.length;
  const variance = magnitude.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitude.length;
  return Math.sqrt(variance);
}

export function calculatePeakAmplitude(magnitude: number[]): number {
  if (magnitude.length === 0) return 0;
  
  const mean = magnitude.reduce((sum, val) => sum + val, 0) / magnitude.length;
  const deviations = magnitude.map(val => Math.abs(val - mean));
  return Math.max(...deviations);
}

export function calculateStats(magnitude: number[]): RecordingStats {
  return {
    meanAmplitude: calculateTremorAmplitude(magnitude),
    variability: calculateVariability(magnitude),
    peakAmplitude: calculatePeakAmplitude(magnitude),
  };
}

export function smoothData(data: number[], windowSize: number = 5): number[] {
  if (data.length === 0) return [];
  if (windowSize >= data.length) return data;
  
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data.slice(start, end);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    smoothed.push(avg);
  }
  
  return smoothed;
}

const VARIABILITY_AT_100 = 0.12;

export function getTremorScore(stats: RecordingStats): number {
  const { variability, meanAmplitude } = stats;
  const fromVariability = (variability / VARIABILITY_AT_100) * 100;
  const fromAmplitude = Math.min(30, meanAmplitude * 100);
  const raw = fromVariability + fromAmplitude * 0.5;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getTremorScoreLabel(score: number): 'Low' | 'Moderate' | 'Elevated' | 'High' {
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  if (score <= 75) return 'Elevated';
  return 'High';
}

export function detectAnomalies(magnitude: number[], threshold: number = 2): number[] {
  if (magnitude.length === 0) return [];
  
  const mean = magnitude.reduce((sum, val) => sum + val, 0) / magnitude.length;
  const stdDev = calculateVariability(magnitude);
  const anomalies: number[] = [];
  
  magnitude.forEach((val, index) => {
    const zScore = Math.abs((val - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(index);
    }
  });
  
  return anomalies;
}
