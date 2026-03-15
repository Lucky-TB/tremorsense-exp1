import { RecordingContext, RecordingSession, SamplingRate } from "@/types";
import {
  calculateMagnitudeArray,
  calculateStats,
} from "@/utils/signalProcessing";
import { saveSession } from "@/utils/storage";
import { useCallback, useRef, useState } from "react";
import { useSensors } from "./useSensors";

export function useRecording(
  samplingRate: SamplingRate,
  duration: number,
  context?: RecordingContext,
  onComplete?: (session: RecordingSession | null) => void,
) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { isAvailable, readings, clearReadings, getReadings, accelerometerData, gyroscopeData } =
    useSensors(samplingRate, isRecording);
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
      setError("No data collected");
      onComplete?.(null);
      return null;
    }

    const accelerometer = {
      x: allReadings.map((r) => r.accelerometer.x),
      y: allReadings.map((r) => r.accelerometer.y),
      z: allReadings.map((r) => r.accelerometer.z),
    };

    const gyroscope = {
      x: allReadings.map((r) => r.gyroscope.x),
      y: allReadings.map((r) => r.gyroscope.y),
      z: allReadings.map((r) => r.gyroscope.z),
    };

    const magnitude = calculateMagnitudeArray(accelerometer);
    const stats = calculateStats(magnitude);

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
      onComplete?.(session);
      return session;
    } catch (err) {
      setError("Failed to save session");
      console.error(err);
      onComplete?.(null);
      return null;
    }
  }, [getReadings, clearReadings, context, duration, onComplete]);

  const startRecording = useCallback(async () => {
    if (!isAvailable) {
      setError("Sensors are not available on this device");
      return;
    }

    setError(null);
    clearReadings();

    setCountdown(3);
    await new Promise((resolve) => {
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

    setIsRecording(true);
    const startTime = Date.now();
    startTimeRef.current = startTime;

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
    accelerometerData,
    gyroscopeData,
  };
}
