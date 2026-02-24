// Custom hook for sensor data collection

import { useState, useEffect, useRef } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { SamplingRate } from '@/types';

const SAMPLING_RATES = {
  low: 50,    // 50ms = 20Hz
  medium: 20, // 20ms = 50Hz
  high: 10,   // 10ms = 100Hz
};

export interface SensorReading {
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  timestamp: number;
}

export function useSensors(samplingRate: SamplingRate = 'medium', enabled: boolean = false) {
  const [accelerometerData, setAccelerometerData] = useState<{ x: number; y: number; z: number } | null>(null);
  const [gyroscopeData, setGyroscopeData] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const readingsRef = useRef<SensorReading[]>([]);
  const accelDataRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const gyroDataRef = useRef<{ x: number; y: number; z: number } | null>(null);
  
  const interval = SAMPLING_RATES[samplingRate];

  useEffect(() => {
    // Check availability
    Accelerometer.isAvailableAsync().then(accelAvailable => {
      Gyroscope.isAvailableAsync().then(gyroAvailable => {
        setIsAvailable(accelAvailable && gyroAvailable);
      });
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      readingsRef.current = [];
      setReadings([]);
      return;
    }

    // Set update intervals
    Accelerometer.setUpdateInterval(interval);
    Gyroscope.setUpdateInterval(interval);

    // Subscribe to sensors
    const accelSubscription = Accelerometer.addListener(data => {
      setAccelerometerData(data);
      accelDataRef.current = data;
    });

    const gyroSubscription = Gyroscope.addListener(data => {
      setGyroscopeData(data);
      gyroDataRef.current = data;
    });

    // Collect readings
    const collectionInterval = setInterval(() => {
      if (accelDataRef.current && gyroDataRef.current) {
        const reading: SensorReading = {
          accelerometer: { ...accelDataRef.current },
          gyroscope: { ...gyroDataRef.current },
          timestamp: Date.now(),
        };
        
        readingsRef.current.push(reading);
        setReadings([...readingsRef.current]);
      }
    }, interval);

    return () => {
      accelSubscription.remove();
      gyroSubscription.remove();
      clearInterval(collectionInterval);
    };
  }, [enabled, samplingRate, interval]);

  const clearReadings = () => {
    readingsRef.current = [];
    setReadings([]);
  };

  const getReadings = () => readingsRef.current;

  return {
    accelerometerData,
    gyroscopeData,
    isAvailable,
    readings,
    clearReadings,
    getReadings,
  };
}
