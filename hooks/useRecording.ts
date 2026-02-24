// Custom hook for recording sessions

import { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingSession, RecordingContext, SamplingRate } from '@/types';
import { useSensors } from './useSensors';
import { calculateMagnitudeArray, calculateStats } from '@/utils/signalProcessing';
import { saveSession } from '@/utils/storage';

export function useRecording(
  samplingRate: SamplingRate,
  duration: number,
  context?: RecordingContext
) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { isAvailable, readings, clearReadings, getReadings } = useSensors(samplingRate, isRecording);
  const startTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setProgress(0);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const allReadings = getReadings();
    
    if (allReadings.length === 0) {
      setError('No data collected');
      return null;
    }

    // Process data
    const accelerometer = {
      x: allReadings.map(r => r.accelerometer.x),
      y: allReadings.map(r => r.accelerometer.y),
      z: allReadings.map(r => r.accelerometer.z),
    };

    const gyroscope = {
      x: allReadings.map(r => r.gyroscope.x),
      y: allReadings.map(r => r.gyroscope.y),
      z: allReadings.map(r => r.gyroscope.z),
    };

    const magnitude = calculateMagnitudeArray(accelerometer);
    const stats = calculateStats(magnitude);

    // Create session
    const session: RecordingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: startTimeRef.current || Date.now(),
      duration: duration,
      accelerometer,
      gyroscope,
      magnitude,
      stats,
      context,
    };

    try {
      await saveSession(session);
      clearReadings();
      startTimeRef.current = null;
      return session;
    } catch (err) {
      setError('Failed to save session');
      console.error(err);
      return null;
    }
  }, [getReadings, clearReadings, context, duration]);

  const startRecording = useCallback(async () => {
    if (!isAvailable) {
      setError('Sensors are not available on this device');
      return;
    }

    setError(null);
    clearReadings();

    // Countdown
    setCountdown(3);
    await new Promise(resolve => {
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(countdownInterval);
          setCountdown(null);
          resolve(null);
        } else {
          setCountdown(count);
        }
      }, 1000);
    });

    // Start recording
    setIsRecording(true);
    const startTime = Date.now();
    startTimeRef.current = startTime;

    // Update progress
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progressPercent = Math.min(100, (elapsed / duration) * 100);
      setProgress(progressPercent);

      if (elapsed >= duration) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        stopRecording();
      }
    }, 100);
  }, [isAvailable, duration, clearReadings, stopRecording]);

  return {
    isRecording,
    countdown,
    progress,
    error,
    readings,
    startRecording,
    stopRecording,
    isAvailable,
  };
}
