// Live waveform preview component

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from './LineChart';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WaveformPreviewProps {
  data: number[];
  maxPoints?: number;
}

export function WaveformPreview({ data, maxPoints = 100 }: WaveformPreviewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Take only the most recent points for performance
  const displayData = data.slice(-maxPoints);
  
  if (displayData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <View style={styles.emptyContainer}>
          {/* Empty state */}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <LineChart
        data={displayData}
        height={150}
        color={isDark ? '#4A9EFF' : '#007AFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  emptyContainer: {
    height: 150,
  },
});
