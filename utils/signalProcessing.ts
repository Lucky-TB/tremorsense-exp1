import { SensorData, RecordingStats, SamplingRate } from '@/types';

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

// ─── FFT-based Frequency Analysis ───────────────────────────────────────────

export type TremorType =
  | 'none'
  | 'parkinsonian'
  | 'essential'
  | 'physiological'
  | 'enhanced_physiological';

export interface FrequencyAnalysis {
  /** Dominant tremor frequency in Hz */
  dominantFrequency: number;
  /** Power at the dominant frequency */
  dominantPower: number;
  /** Clinical tremor type based on frequency band */
  tremorType: TremorType;
  /** Human-readable label */
  tremorTypeLabel: string;
  /** Confidence 0-1 based on spectral peak sharpness */
  confidence: number;
  /** Full power spectrum for visualization (frequency, power) pairs */
  spectrum: { frequency: number; power: number }[];
  /** Frequency bands breakdown */
  bands: {
    label: string;
    range: string;
    power: number;
    percentage: number;
  }[];
}

/**
 * Cooley-Tukey radix-2 FFT.
 * Input length must be a power of 2. Returns complex array [re, im, re, im, ...].
 */
function fft(re: number[], im: number[]): { re: number[]; im: number[] } {
  const N = re.length;
  if (N <= 1) return { re: [...re], im: [...im] };

  // Bit-reversal permutation
  const outRe = new Array<number>(N);
  const outIm = new Array<number>(N);
  const bits = Math.log2(N);
  for (let i = 0; i < N; i++) {
    let rev = 0;
    let x = i;
    for (let b = 0; b < bits; b++) {
      rev = (rev << 1) | (x & 1);
      x >>= 1;
    }
    outRe[rev] = re[i];
    outIm[rev] = im[i];
  }

  // Butterfly stages
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const cos = Math.cos(angle * j);
        const sin = Math.sin(angle * j);
        const tRe = outRe[i + j + halfSize] * cos - outIm[i + j + halfSize] * sin;
        const tIm = outRe[i + j + halfSize] * sin + outIm[i + j + halfSize] * cos;
        outRe[i + j + halfSize] = outRe[i + j] - tRe;
        outIm[i + j + halfSize] = outIm[i + j] - tIm;
        outRe[i + j] += tRe;
        outIm[i + j] += tIm;
      }
    }
  }

  return { re: outRe, im: outIm };
}

/** Pad/truncate signal to nearest power of 2 */
function toPowerOf2(signal: number[]): number[] {
  const N = Math.pow(2, Math.ceil(Math.log2(signal.length)));
  const padded = new Array<number>(N).fill(0);
  for (let i = 0; i < Math.min(signal.length, N); i++) {
    padded[i] = signal[i];
  }
  return padded;
}

/** Apply Hanning window to reduce spectral leakage */
function hanningWindow(signal: number[]): number[] {
  const N = signal.length;
  return signal.map((val, i) => val * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))));
}

/** Remove DC offset (mean) from signal */
function removeDC(signal: number[]): number[] {
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  return signal.map(v => v - mean);
}

/**
 * Classify tremor type based on dominant frequency.
 * Clinical frequency bands from medical literature:
 * - Parkinsonian resting tremor: 3–5 Hz
 * - Essential tremor: 5–8 Hz
 * - Enhanced physiological: 8–12 Hz
 * - Physiological (normal): 8–12 Hz, very low amplitude
 */
function classifyTremorType(
  freqHz: number,
  power: number,
  totalPower: number,
): { type: TremorType; label: string } {
  const relPower = totalPower > 0 ? power / totalPower : 0;

  // Very low relative power = no meaningful tremor
  if (relPower < 0.05 || freqHz < 2) {
    return { type: 'none', label: 'No significant tremor' };
  }
  if (freqHz >= 3 && freqHz < 5) {
    return { type: 'parkinsonian', label: 'Parkinsonian pattern (3–5 Hz)' };
  }
  if (freqHz >= 5 && freqHz < 8) {
    return { type: 'essential', label: 'Essential tremor pattern (5–8 Hz)' };
  }
  if (freqHz >= 8 && freqHz <= 12) {
    return { type: 'enhanced_physiological', label: 'Enhanced physiological (8–12 Hz)' };
  }
  if (freqHz > 12) {
    return { type: 'physiological', label: 'High-frequency / physiological' };
  }
  return { type: 'none', label: 'Sub-tremor frequency' };
}

/**
 * Compute full frequency analysis on a magnitude time series.
 * @param magnitude - Accelerometer magnitude array
 * @param sampleRateHz - Sensor sampling rate in Hz (default 50 for 'medium')
 */
export function analyzeFrequency(
  magnitude: number[],
  sampleRateHz: number = 50,
): FrequencyAnalysis {
  if (magnitude.length < 16) {
    return {
      dominantFrequency: 0,
      dominantPower: 0,
      tremorType: 'none',
      tremorTypeLabel: 'Insufficient data',
      confidence: 0,
      spectrum: [],
      bands: [],
    };
  }

  // Pre-process: remove DC offset → Hanning window → pad to power of 2
  const cleaned = removeDC(magnitude);
  const windowed = hanningWindow(cleaned);
  const padded = toPowerOf2(windowed);
  const N = padded.length;

  // Run FFT
  const im = new Array<number>(N).fill(0);
  const result = fft(padded, im);

  // Compute power spectrum (only first half — up to Nyquist)
  const halfN = N / 2;
  const freqResolution = sampleRateHz / N;
  const spectrum: { frequency: number; power: number }[] = [];
  let totalPower = 0;

  for (let i = 1; i < halfN; i++) {
    const freq = i * freqResolution;
    if (freq > sampleRateHz / 2) break;
    const power = (result.re[i] * result.re[i] + result.im[i] * result.im[i]) / N;
    spectrum.push({ frequency: freq, power });
    totalPower += power;
  }

  // Find dominant frequency in the clinical tremor range (2–15 Hz)
  let dominantFreq = 0;
  let dominantPower = 0;
  for (const bin of spectrum) {
    if (bin.frequency >= 2 && bin.frequency <= 15 && bin.power > dominantPower) {
      dominantPower = bin.power;
      dominantFreq = bin.frequency;
    }
  }

  // Confidence: ratio of peak power to surrounding noise in tremor band
  const tremorBandPower = spectrum
    .filter(s => s.frequency >= 2 && s.frequency <= 15)
    .reduce((sum, s) => sum + s.power, 0);
  const confidence = tremorBandPower > 0
    ? Math.min(1, dominantPower / (tremorBandPower * 0.3))
    : 0;

  // Classification
  const { type, label } = classifyTremorType(dominantFreq, dominantPower, totalPower);

  // Frequency band breakdown
  const bandDefs = [
    { label: 'Sub-tremor', range: '0–3 Hz', min: 0, max: 3 },
    { label: 'Parkinsonian', range: '3–5 Hz', min: 3, max: 5 },
    { label: 'Essential', range: '5–8 Hz', min: 5, max: 8 },
    { label: 'Physiological', range: '8–12 Hz', min: 8, max: 12 },
    { label: 'High-freq', range: '12+ Hz', min: 12, max: Infinity },
  ];

  const bands = bandDefs.map(b => {
    const bandPower = spectrum
      .filter(s => s.frequency >= b.min && s.frequency < b.max)
      .reduce((sum, s) => sum + s.power, 0);
    return {
      label: b.label,
      range: b.range,
      power: bandPower,
      percentage: totalPower > 0 ? (bandPower / totalPower) * 100 : 0,
    };
  });

  return {
    dominantFrequency: Math.round(dominantFreq * 10) / 10,
    dominantPower,
    tremorType: type,
    tremorTypeLabel: label,
    confidence: Math.round(confidence * 100) / 100,
    spectrum,
    bands,
  };
}

/** Map SamplingRate setting to actual Hz */
export function samplingRateToHz(rate: SamplingRate): number {
  const map: Record<SamplingRate, number> = { low: 20, medium: 50, high: 100 };
  return map[rate];
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
