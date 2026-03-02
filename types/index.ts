// Core data types for tremor tracking app

export type SamplingRate = 'low' | 'medium' | 'high';

export interface SensorData {
  x: number[];
  y: number[];
  z: number[];
}

export interface RecordingContext {
  caffeine?: boolean;
  sleepDeprived?: boolean;
  stress?: boolean;
  notes?: string;
}

export interface RecordingStats {
  meanAmplitude: number;
  variability: number;
  peakAmplitude: number;
}

export interface RecordingSession {
  id: string;
  timestamp: number;
  duration: number;
  accelerometer: SensorData;
  gyroscope: SensorData;
  magnitude: number[];
  stats: RecordingStats;
  context?: RecordingContext;
}

export interface AppSettings {
  samplingRate: SamplingRate;
  recordingDuration: number; // in seconds
  theme: 'light' | 'dark' | 'auto';
}

export interface StabilityClassification {
  type: 'stable' | 'variable' | 'increasing' | 'irregular';
  confidence: number;
}

export interface TrendAnalysis {
  stabilityScore: number; // 0-100
  classification: StabilityClassification;
  summary: string;
  anomalies: string[];
  correlations: {
    context: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}
