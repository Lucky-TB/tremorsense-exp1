// Graphs tab - Multiple data visualizations

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Picker,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RecordingSession } from '@/types';
import { loadAllSessions } from '@/utils/storage';
import { LineChart } from '@/components/LineChart';
import { useFocusEffect } from '@react-navigation/native';
import { calculateRollingAverage, groupSessionsByDay } from '@/utils/analysis';
import { smoothData } from '@/utils/signalProcessing';

export default function GraphsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sensorType, setSensorType] = useState<'accelerometer' | 'gyroscope'>('accelerometer');
  const [axis, setAxis] = useState<'magnitude' | 'x' | 'y' | 'z'>('magnitude');
  const [smooth, setSmooth] = useState(false);
  const [viewType, setViewType] = useState<'session' | 'trend' | 'daily'>('session');

  useFocusEffect(
    useCallback(() => {
      loadAllSessions().then(loaded => {
        setSessions(loaded.sort((a, b) => b.timestamp - a.timestamp));
        if (loaded.length > 0 && !selectedSessionId) {
          setSelectedSessionId(loaded[0].id);
        }
      });
    }, [selectedSessionId])
  );

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const backgroundColor = isDark ? '#000000' : '#F2F2F7';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#98989D' : '#6D6D70';
  const primaryColor = isDark ? '#4A9EFF' : '#007AFF';

  const getSessionData = (session: RecordingSession | undefined) => {
    if (!session) return [];
    
    const sensor = sensorType === 'accelerometer' ? session.accelerometer : session.gyroscope;
    
    if (axis === 'magnitude') {
      return session.magnitude;
    } else if (axis === 'x') {
      return sensor.x;
    } else if (axis === 'y') {
      return sensor.y;
    } else {
      return sensor.z;
    }
  };

  const getTrendData = () => {
    if (sessions.length === 0) return { labels: [], data: [] };
    
    const rolling = calculateRollingAverage(sessions, 7);
    return {
      labels: rolling.map(r => {
        const date = new Date(r.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      data: rolling.map(r => r.average),
    };
  };

  const getDailyData = () => {
    if (sessions.length === 0) return { labels: [], data: [] };
    
    const grouped = groupSessionsByDay(sessions);
    const sortedDays = Array.from(grouped.keys()).sort();
    
    const dailyAverages = sortedDays.map(day => {
      const daySessions = grouped.get(day) || [];
      const avg = daySessions.reduce((sum, s) => sum + s.stats.variability, 0) / daySessions.length;
      return avg;
    });
    
    return {
      labels: sortedDays.map(day => {
        const date = new Date(day);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      data: dailyAverages,
    };
  };

  const renderSessionGraph = () => {
    if (!selectedSession) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
            No session selected
          </Text>
        </View>
      );
    }

    let data = getSessionData(selectedSession);
    if (smooth && data.length > 0) {
      data = smoothData(data, 5);
    }

    const labels = data.map((_, i) => {
      if (data.length <= 20) return String(i);
      if (i % Math.floor(data.length / 10) === 0) return String(i);
      return '';
    });

    return (
      <LineChart
        data={data}
        labels={labels}
        title={`${sensorType === 'accelerometer' ? 'Accelerometer' : 'Gyroscope'} - ${axis.toUpperCase()} Axis`}
        yAxisSuffix=""
        height={250}
      />
    );
  };

  const renderTrendGraph = () => {
    const trendData = getTrendData();
    
    if (trendData.data.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
            Not enough data for trend analysis
          </Text>
        </View>
      );
    }

    return (
      <LineChart
        data={trendData.data}
        labels={trendData.labels}
        title="7-Day Rolling Average Variability"
        yAxisSuffix=""
        height={250}
      />
    );
  };

  const renderDailyGraph = () => {
    const dailyData = getDailyData();
    
    if (dailyData.data.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
            No data available
          </Text>
        </View>
      );
    }

    return (
      <LineChart
        data={dailyData.data}
        labels={dailyData.labels}
        title="Daily Average Variability"
        yAxisSuffix=""
        height={250}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Graphs</Text>
        </View>

      {/* View Type Selector */}
      <View style={[styles.selectorContainer, { backgroundColor: cardColor }]}>
        <Text style={[styles.selectorLabel, { color: textColor }]}>View Type</Text>
        <View style={styles.selectorRow}>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: viewType === 'session' ? primaryColor : 'transparent',
                borderColor: primaryColor,
              },
            ]}
            onPress={() => setViewType('session')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                { color: viewType === 'session' ? '#FFFFFF' : textColor },
              ]}
            >
              Session
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: viewType === 'trend' ? primaryColor : 'transparent',
                borderColor: primaryColor,
              },
            ]}
            onPress={() => setViewType('trend')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                { color: viewType === 'trend' ? '#FFFFFF' : textColor },
              ]}
            >
              Trend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: viewType === 'daily' ? primaryColor : 'transparent',
                borderColor: primaryColor,
              },
            ]}
            onPress={() => setViewType('daily')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                { color: viewType === 'daily' ? '#FFFFFF' : textColor },
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Session-specific controls */}
      {viewType === 'session' && (
        <>
          {/* Session Selector */}
          {sessions.length > 0 && (
            <View style={[styles.controlContainer, { backgroundColor: cardColor }]}>
              <Text style={[styles.controlLabel, { color: textColor }]}>Select Session</Text>
              <View style={[styles.pickerContainer, { backgroundColor: backgroundColor }]}>
                <ScrollView style={styles.pickerScroll}>
                  {sessions.map(session => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.pickerOption,
                        {
                          backgroundColor: selectedSessionId === session.id ? primaryColor : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedSessionId(session.id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          {
                            color:
                              selectedSessionId === session.id ? '#FFFFFF' : textColor,
                          },
                        ]}
                      >
                        {new Date(session.timestamp).toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Sensor Type Selector */}
          <View style={[styles.controlContainer, { backgroundColor: cardColor }]}>
            <Text style={[styles.controlLabel, { color: textColor }]}>Sensor Type</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  {
                    backgroundColor: sensorType === 'accelerometer' ? primaryColor : 'transparent',
                    borderColor: primaryColor,
                  },
                ]}
                onPress={() => setSensorType('accelerometer')}
              >
                <Text
                  style={[
                    styles.selectorButtonText,
                    { color: sensorType === 'accelerometer' ? '#FFFFFF' : textColor },
                  ]}
                >
                  Accelerometer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  {
                    backgroundColor: sensorType === 'gyroscope' ? primaryColor : 'transparent',
                    borderColor: primaryColor,
                  },
                ]}
                onPress={() => setSensorType('gyroscope')}
              >
                <Text
                  style={[
                    styles.selectorButtonText,
                    { color: sensorType === 'gyroscope' ? '#FFFFFF' : textColor },
                  ]}
                >
                  Gyroscope
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Axis Selector */}
          <View style={[styles.controlContainer, { backgroundColor: cardColor }]}>
            <Text style={[styles.controlLabel, { color: textColor }]}>Axis</Text>
            <View style={styles.selectorRow}>
              {(['magnitude', 'x', 'y', 'z'] as const).map(ax => (
                <TouchableOpacity
                  key={ax}
                  style={[
                    styles.selectorButton,
                    {
                      backgroundColor: axis === ax ? primaryColor : 'transparent',
                      borderColor: primaryColor,
                    },
                  ]}
                  onPress={() => setAxis(ax)}
                >
                  <Text
                    style={[
                      styles.selectorButtonText,
                      { color: axis === ax ? '#FFFFFF' : textColor },
                    ]}
                  >
                    {ax.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Smooth Toggle */}
          <View style={[styles.controlContainer, { backgroundColor: cardColor }]}>
            <View style={styles.toggleRow}>
              <Text style={[styles.controlLabel, { color: textColor }]}>Smooth Data</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: smooth ? primaryColor : '#3E3E42',
                  },
                ]}
                onPress={() => setSmooth(!smooth)}
              >
                <Text style={styles.toggleButtonText}>{smooth ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Graph Display */}
      <View style={styles.graphContainer}>
        {viewType === 'session' && renderSessionGraph()}
        {viewType === 'trend' && renderTrendGraph()}
        {viewType === 'daily' && renderDailyGraph()}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    marginTop: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  selectorContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  selectorButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  controlContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  controlLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  pickerContainer: {
    borderRadius: 16,
    maxHeight: 200,
    borderWidth: 1.5,
    borderColor: '#3E3E42',
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerOption: {
    padding: 14,
    borderRadius: 10,
    margin: 6,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  graphContainer: {
    marginTop: 12,
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  emptyText: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
});
