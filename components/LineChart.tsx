import React from 'react';
import { Dimensions, View, Text, StyleSheet } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { useColorScheme } from '@/hooks/use-color-scheme';

const screenWidth = Dimensions.get('window').width;
const DEFAULT_CHART_WIDTH = Math.min(screenWidth - 72, 320);

interface LineChartProps {
  data: number[];
  labels?: string[];
  title?: string;
  yAxisSuffix?: string;
  color?: string;
  height?: number;
  width?: number;
}

export function LineChart({
  data,
  labels,
  title,
  yAxisSuffix = '',
  color,
  height = 220,
  width = DEFAULT_CHART_WIDTH,
}: LineChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const chartColor = color || (isDark ? '#5CC5AB' : '#2D9B8A');
  const textColor = isDark ? '#E8E4DC' : '#1C1C1E';
  const backgroundColor = isDark ? '#1A2428' : '#FFFFFF';
  const gridColor = isDark ? '#2A3438' : '#E5E5E0';

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
    decimalPlaces: 0,
    color: (opacity = 1) => chartColor,
    labelColor: (opacity = 1) => isDark ? '#8A8A8E' : '#6D6D72',
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3.5',
      strokeWidth: '2',
      stroke: chartColor,
      fill: isDark ? '#E8E4DC' : '#FFFFFF',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
      strokeWidth: 0.5,
    },
  };

  if (data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {title && <Text style={[styles.title, { color: textColor }]}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#8A8A8E' : '#6D6D72' }]}>No data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {title && <Text style={[styles.title, { color: isDark ? '#8A8A8E' : '#6D6D72' }]}>{title}</Text>}
      <RNLineChart
        data={chartData}
        width={width}
        height={height}
        yAxisSuffix={yAxisSuffix}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chart: {
    marginVertical: 4,
    borderRadius: 16,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
  },
});
