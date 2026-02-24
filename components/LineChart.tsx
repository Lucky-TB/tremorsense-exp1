// Line chart component using react-native-chart-kit

import React from 'react';
import { Dimensions, View, Text, StyleSheet } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { useColorScheme } from '@/hooks/use-color-scheme';

const screenWidth = Dimensions.get('window').width;

interface LineChartProps {
  data: number[];
  labels?: string[];
  title?: string;
  yAxisSuffix?: string;
  color?: string;
  height?: number;
}

export function LineChart({
  data,
  labels,
  title,
  yAxisSuffix = '',
  color,
  height = 220,
}: LineChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const chartColor = color || (isDark ? '#4A9EFF' : '#007AFF');
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const backgroundColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const gridColor = isDark ? '#2C2C2E' : '#E5E5EA';
  
  // Prepare data for chart
  const chartData = {
    labels: labels || data.map((_, i) => ''),
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => chartColor,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: backgroundColor,
    backgroundGradientFrom: backgroundColor,
    backgroundGradientTo: backgroundColor,
    decimalPlaces: 2,
    color: (opacity = 1) => chartColor,
    labelColor: (opacity = 1) => textColor,
    style: {
      borderRadius: 20,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2.5',
      stroke: chartColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
      strokeWidth: 1.5,
    },
  };

  if (data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {title && <Text style={[styles.title, { color: textColor }]}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: textColor }]}>No data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {title && <Text style={[styles.title, { color: textColor }]}>{title}</Text>}
      <RNLineChart
        data={chartData}
        width={screenWidth - 40}
        height={height}
        yAxisSuffix={yAxisSuffix}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    fontWeight: '400',
  },
});
